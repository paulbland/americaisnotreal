import { describe, expect, it } from "vitest";
import {
  addUsage,
  costFooter,
  DEFAULT_DISCOVERY_MODEL,
  DEFAULT_VERIFIER_MODEL,
  modelLabel,
  PRICES,
  resolveModels,
  tokenCost,
  totals,
  UNPRICED_AS,
  type ResponseUsage,
  type UsageByModel,
} from "../scripts/lib/models.ts";
import { DaySchema, ScanLogSchema } from "../src/data/schema.ts";
import { fixtureDay } from "./fixtures/day.ts";

const SONNET = "claude-sonnet-5-5";
const OPUS = "claude-opus-5-5";
const SPLIT = { discovery: SONNET, verifier: OPUS };

function response(over: Partial<ResponseUsage> = {}): ResponseUsage {
  return { input_tokens: 0, output_tokens: 0, ...over };
}

/** A million of each token type, so the cost is the sum of the four list prices. */
const MILLION_EACH = response({
  input_tokens: 1e6,
  output_tokens: 1e6,
  cache_read_input_tokens: 1e6,
  cache_creation_input_tokens: 1e6,
});

describe("scan models", () => {
  it("defaults discovery to Sonnet 5.5 and the verifier to Opus 5.5", () => {
    expect(DEFAULT_DISCOVERY_MODEL).toBe(SONNET);
    expect(DEFAULT_VERIFIER_MODEL).toBe(OPUS);
    expect(resolveModels({})).toEqual(SPLIT);
  });

  it("treats an empty or blank variable as unset, as GitHub sends an unset repository variable", () => {
    expect(resolveModels({ SCAN_DISCOVERY_MODEL: "", SCAN_VERIFIER_MODEL: "" })).toEqual(SPLIT);
    expect(resolveModels({ SCAN_DISCOVERY_MODEL: "  ", SCAN_VERIFIER_MODEL: "\n" })).toEqual(SPLIT);
  });

  it("lets either job be overridden on its own", () => {
    expect(resolveModels({ SCAN_DISCOVERY_MODEL: OPUS })).toEqual({
      discovery: OPUS,
      verifier: OPUS,
    });
    expect(resolveModels({ SCAN_VERIFIER_MODEL: " claude-next " })).toEqual({
      discovery: SONNET,
      verifier: "claude-next",
    });
  });

  it("labels one model as its bare id, the form of every log before the split", () => {
    expect(modelLabel({ discovery: OPUS, verifier: OPUS })).toBe(OPUS);
  });

  it("labels two models with the job each one did", () => {
    expect(modelLabel(SPLIT)).toBe("claude-sonnet-5-5 (discovery), claude-opus-5-5 (verifier)");
  });

  it("writes a label the day and scan-log schemas accept", () => {
    const model = modelLabel(SPLIT);
    expect(DaySchema.safeParse({ ...fixtureDay, model }).success).toBe(true);
    const log = {
      date: "2026-01-15",
      startedAt: "2026-01-15T10:00:00.000Z",
      finishedAt: "2026-01-15T10:06:00.000Z",
      model,
      searches: 90,
      summary: "Pair published.",
      published: true,
      candidates: [],
    };
    expect(ScanLogSchema.safeParse(log).success).toBe(true);
  });
});

describe("scan cost", () => {
  it("prices each model at its own list rates", () => {
    const usage: UsageByModel = new Map();
    addUsage(usage, SONNET, MILLION_EACH);
    addUsage(usage, OPUS, MILLION_EACH);
    // Sonnet 5.5: 2 + 10 + 0.10 + 2.50. Opus 5.5: 4 + 20 + 0.20 + 5.
    expect(tokenCost(SONNET, usage.get(SONNET)!)).toBeCloseTo(14.6, 10);
    expect(tokenCost(OPUS, usage.get(OPUS)!)).toBeCloseTo(29.2, 10);
    expect(totals(usage).cost).toBeCloseTo(43.8, 10);
  });

  it("charges a cent a search, whichever model made it, and nothing for fetches", () => {
    const usage: UsageByModel = new Map();
    addUsage(
      usage,
      SONNET,
      response({ server_tool_use: { web_search_requests: 90, web_fetch_requests: 20 } }),
    );
    addUsage(
      usage,
      OPUS,
      response({ server_tool_use: { web_search_requests: 8, web_fetch_requests: 6 } }),
    );
    const t = totals(usage);
    expect(t.searches).toBe(98);
    expect(t.fetches).toBe(26);
    expect(t.cost).toBeCloseTo(0.98, 10);
  });

  it("matches the single-model formula it replaces when both jobs run on Opus 5.5", () => {
    const u = {
      input_tokens: 123_456,
      output_tokens: 45_678,
      cache_read_input_tokens: 987_654,
      cache_creation_input_tokens: 12_345,
      server_tool_use: { web_search_requests: 90, web_fetch_requests: 26 },
    };
    const usage: UsageByModel = new Map();
    addUsage(usage, OPUS, u);
    const old =
      (u.input_tokens * 4 +
        u.cache_creation_input_tokens * 5 +
        u.cache_read_input_tokens * 0.2 +
        u.output_tokens * 20) /
        1e6 +
      90 * 0.01;
    expect(totals(usage).cost).toBeCloseTo(old, 10);
  });

  it("counts missing cache and tool fields as zero", () => {
    const usage: UsageByModel = new Map();
    addUsage(usage, SONNET, {
      input_tokens: 10,
      output_tokens: 5,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null,
      server_tool_use: null,
    });
    expect(usage.get(SONNET)).toEqual({
      input: 10,
      output: 5,
      cacheRead: 0,
      cacheWrite: 0,
      searches: 0,
      fetches: 0,
    });
  });

  it("loses nothing when runs on the same model interleave under Promise.all", async () => {
    const usage: UsageByModel = new Map();
    const run = async (model: string, turns: number) => {
      for (let i = 0; i < turns; i++) {
        await new Promise((resolve) => setTimeout(resolve, i % 3));
        addUsage(
          usage,
          model,
          response({
            input_tokens: 100,
            output_tokens: 10,
            server_tool_use: { web_search_requests: 1, web_fetch_requests: 2 },
          }),
        );
      }
    };
    // Two discovery runs on one model, as in the scan, with a verifier alongside.
    await Promise.all([run(SONNET, 12), run(SONNET, 7), run(OPUS, 5)]);
    expect(usage.get(SONNET)).toMatchObject({
      input: 1900,
      output: 190,
      searches: 19,
      fetches: 38,
    });
    expect(usage.get(OPUS)).toMatchObject({ input: 500, output: 50, searches: 5, fetches: 10 });
  });

  it("prices an unknown model at Opus 5.5 rates instead of zero, and says so", () => {
    const usage: UsageByModel = new Map();
    addUsage(usage, "claude-next", MILLION_EACH);
    expect(tokenCost("claude-next", usage.get("claude-next")!)).toBeCloseTo(29.2, 10);
    const footer = costFooter({ discovery: "claude-next", verifier: OPUS }, usage);
    expect(footer[0]).toContain("~$29.20</sub>");
    expect(footer[1]).toContain(`(no list price on file; priced as ${UNPRICED_AS})`);
    expect(footer[2]).not.toContain("no list price");
  });

  it("does not mistake an inherited property name for a priced model", () => {
    const usage: UsageByModel = new Map();
    addUsage(usage, "constructor", MILLION_EACH);
    expect(tokenCost("constructor", usage.get("constructor")!)).toBeCloseTo(29.2, 10);
  });

  it("has a price for both default models and for the fallback", () => {
    for (const model of [DEFAULT_DISCOVERY_MODEL, DEFAULT_VERIFIER_MODEL, UNPRICED_AS]) {
      expect(PRICES[model]).toBeDefined();
    }
  });
});

describe("scan PR footer", () => {
  const usage: UsageByModel = new Map();
  addUsage(usage, SONNET, {
    input_tokens: 61_250,
    output_tokens: 38_400,
    cache_read_input_tokens: 1_204_800,
    cache_creation_input_tokens: 18_900,
    server_tool_use: { web_search_requests: 90, web_fetch_requests: 21 },
  });
  addUsage(usage, OPUS, {
    input_tokens: 22_100,
    output_tokens: 9_800,
    cache_read_input_tokens: 96_300,
    cache_creation_input_tokens: 7_400,
    server_tool_use: { web_search_requests: 6, web_fetch_requests: 9 },
  });

  it("names both models, keeps the totals segments, and splits tokens per model", () => {
    expect(costFooter(SPLIT, usage)).toEqual([
      "<sub>claude-sonnet-5-5 (discovery), claude-opus-5-5 (verifier) · 96 searches · 30 fetches · ~$1.97</sub>",
      "<sub>claude-sonnet-5-5 tokens: 61250 input · 38400 output · 1204800 cache read · 18900 cache write · $0.67</sub>",
      "<sub>claude-opus-5-5 tokens: 22100 input · 9800 output · 96300 cache read · 7400 cache write · $0.34</sub>",
    ]);
  });

  it("keeps the totals line readable by the pattern past footers match", () => {
    const pattern = /· (\d+) searches · (\d+) fetches · ~\$(\d+\.\d{2})<\/sub>/;
    expect("<sub>claude-opus-5-5 · 90 searches · 26 fetches · ~$2.64</sub>").toMatch(pattern);
    const lines = costFooter(SPLIT, usage);
    expect(lines[0]!.match(pattern)?.slice(1)).toEqual(["96", "30", "1.97"]);
    // The per-model lines must not look like a second set of totals.
    for (const line of lines.slice(1)) {
      expect(line).not.toMatch(/searches|fetches|~\$/);
    }
  });

  it("is the old one-model footer, plus the token line, when one model does both jobs", () => {
    const one: UsageByModel = new Map();
    addUsage(one, OPUS, {
      input_tokens: 1000,
      output_tokens: 1000,
      server_tool_use: { web_search_requests: 90, web_fetch_requests: 26 },
    });
    expect(costFooter({ discovery: OPUS, verifier: OPUS }, one)).toEqual([
      "<sub>claude-opus-5-5 · 90 searches · 26 fetches · ~$0.92</sub>",
      "<sub>claude-opus-5-5 tokens: 1000 input · 1000 output · 0 cache read · 0 cache write · $0.02</sub>",
    ]);
  });

  it("lists a configured model that never ran, with zeros", () => {
    const discoveryOnly: UsageByModel = new Map();
    addUsage(discoveryOnly, SONNET, response({ input_tokens: 500_000 }));
    expect(costFooter(SPLIT, discoveryOnly)[2]).toBe(
      "<sub>claude-opus-5-5 tokens: 0 input · 0 output · 0 cache read · 0 cache write · $0.00</sub>",
    );
  });
});
