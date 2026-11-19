/**
 * The daily scan. Run by .github/workflows/scan.yml; `npm run scan -- --dry-run`
 * to try it locally without writing anything; `--date=YYYY-MM-DD` to run it for a
 * past day (used by the backfill).
 *
 *   1. Discovery: Claude searches the accepted publishers and proposes up to four
 *      ranked candidates for each side (SCAN_DISCOVERY_MODEL, Claude Sonnet 5.5
 *      by default).
 *   2. Each candidate, in rank order (facepalm candidates highest score first), must
 *      pass: the schema and repo rules, the party-balance and variety rules (at most
 *      one routine administrative error a week, no facepalm category two days
 *      running), an independent adversarial Claude review that also scores the story
 *      and vouches for any local newsroom it cites
 *      (SCAN_VERIFIER_MODEL, Claude Opus 5.5 by default), and a mechanical check
 *      that its quote and corroboration appear verbatim on two different
 *      publishers' live pages.
 *   3. The first candidate to pass on each side is published together as that
 *      day's pair. If either side has no survivor, nothing is published and the
 *      scan log says why. Every run writes a scan log.
 *
 * Nothing here can delete or rewrite a published day: corrections are made by hand.
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  BenchSchema,
  DaySchema,
  PartySchema,
  ScanLogSchema,
  ScoreSchema,
  SIDES,
  StoryObject,
  type BenchEntry,
  type Day,
  type ScanLog,
  type Side,
  type Story,
} from "../src/data/schema.ts";
import { facepalmLimits, varietyProblem } from "../src/lib/score.ts";
import { partyBalance } from "../src/lib/stats.ts";
import { archiveUrl } from "./lib/archive.ts";
import { fetchPageText, urlKey } from "./lib/fetch.ts";
import { BENCH_FILE, canonicalJson, dayFile, ROOT, scanFile, writeJson } from "./lib/files.ts";
import { checkRepo, storyProblems } from "./lib/integrity.ts";
import {
  addUsage,
  costFooter,
  isPriced,
  modelLabel,
  resolveModels,
  totals,
  UNPRICED_AS,
  type UsageByModel,
} from "./lib/models.ts";
import { DISCOVERY_SYSTEM, discoveryTask, VERIFIER_SYSTEM, verifierTask } from "./lib/prompts.ts";
import { containsQuote, hostOf } from "./lib/verify.ts";

const MODELS = resolveModels(process.env);
const DRY_RUN = process.argv.includes("--dry-run") || process.env.SCAN_DRY_RUN === "true";
const DATE_ARG = process.argv.find((a) => a.startsWith("--date="))?.slice("--date=".length);
const DATE = DATE_ARG ?? new Date().toISOString().slice(0, 10);
const MAX_TRIES_PER_SIDE = Number(process.env.SCAN_MAX_TRIES ?? 3);
const NOTIFY = process.env.SCAN_NOTIFY ?? "";
const OUT_DIR = path.join(ROOT, "scan-output");

if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) throw new Error(`Bad --date: ${DATE}`);

const client = new Anthropic();

// ---------------------------------------------------------------------------
// Proposal shapes (what the discovery model submits)

const CorroborationSchema = z.object({ sourceUrl: z.string(), quote: z.string() }).strict();

const CandidateSchema = StoryObject.extend({
  corroboration: CorroborationSchema,
  /** Discovery's own rating; the verifier's replaces it before anything is published. */
  score: ScoreSchema,
}).strict();
type Candidate = z.infer<typeof CandidateSchema>;

const PassedSchema = z
  .object({ side: z.enum(SIDES), headline: z.string(), reason: z.string() })
  .strict();

/** Candidates are checked one at a time later, so one malformed entry can't sink the rest. */
const ReceivedCandidatesSchema = z.object({
  summary: z.string(),
  candidates: z.array(z.unknown()).default([]),
  passed: z.array(PassedSchema).default([]),
});

/**
 * What discovery is first held to: every candidate must already have the right shape
 * (lengths, enums, required fields). A headline five characters too long used to cost
 * the whole candidate; now the problems go back to the model to fix. If it still can't
 * after two tries, the lenient schema above takes over and only the bad ones are lost.
 */
const CorrectableCandidatesSchema = ReceivedCandidatesSchema.superRefine((v, ctx) => {
  v.candidates.forEach((candidate, i) => {
    const parsed = CandidateSchema.safeParse(candidate);
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      ctx.addIssue({
        code: "custom",
        path: ["candidates", i, ...issue.path],
        message: issue.message,
      });
    }
  });
});

const SubmittedCandidatesSchema = z.object({
  summary: z.string().min(1),
  candidates: z.array(CandidateSchema).max(4),
  passed: z.array(PassedSchema),
});

const RevisionsSchema = z
  .object({
    headline: z.string().nullable(),
    summary: z.string().nullable(),
  })
  .strict();

const VerdictSchema = z
  .object({
    outcome: z.enum(["approve", "reject", "uncertain"]),
    problems: z.array(z.string()),
    reasoning: z.string(),
    /** Corrected copy the verifier wants published instead; null fields keep the original. */
    revisions: RevisionsSchema.nullable(),
    /** The verifier's own rating of the story, 1 to 10. This is the score that is published. */
    score: ScoreSchema,
    /** Hostnames of local newsrooms (sources marked `local`) the verifier vouches for. */
    vouchedLocalHosts: z.array(z.string()),
  })
  .strict();
type Verdict = z.infer<typeof VerdictSchema>;

function inputSchema(schema: z.ZodType): Anthropic.Beta.BetaTool.InputSchema {
  const { $schema: _, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  return json as Anthropic.Beta.BetaTool.InputSchema;
}

const SUBMIT_CANDIDATES: Anthropic.Beta.BetaTool = {
  name: "submit_candidates",
  description:
    "Submit the candidate stories for the requested side. Call exactly once, at the end. Up to four, best first; an empty list is allowed when nothing qualifies.",
  input_schema: inputSchema(SubmittedCandidatesSchema),
};

const SUBMIT_VERDICT: Anthropic.Beta.BetaTool = {
  name: "submit_verdict",
  description: "Submit your verdict on the proposed story. Call exactly once, at the end.",
  input_schema: inputSchema(VerdictSchema),
};

// ---------------------------------------------------------------------------
// Running Claude with server-side web search / fetch

class InvalidFinalInput extends Error {}

/** A safety classifier declined the request and no server-side fallback answered it. */
class ModelRefused extends Error {}

interface AgentResult<T> {
  input: T;
  /** Page text returned by the web_fetch tool, keyed by urlKey(). */
  fetched: Map<string, string>;
}

/** Tokens, searches and fetches per model, so each is priced at its own rates. */
const usage: UsageByModel = new Map();

async function runAgent<T>(opts: {
  model: string;
  system: string;
  task: string;
  finalTool: Anthropic.Beta.BetaTool;
  accept: z.ZodType<T>;
  /** Tried once the model has failed `accept` twice, instead of failing the run. */
  lenient?: z.ZodType<T>;
  effort: "medium" | "high" | "max";
  maxSearches: number;
  maxFetches: number;
  /**
   * The final tool is refused until the run has made this many web searches. Discovery
   * sets it: a model that submits an empty list without searching has not done the job.
   */
  minSearches?: number;
}): Promise<AgentResult<T>> {
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: opts.maxSearches },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: opts.maxFetches },
    opts.finalTool,
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: opts.task }];
  const fetched = new Map<string, string>();
  let nudged = false;
  let corrections = 0;
  let searches = 0;
  let searchReminders = 0;

  for (let turn = 0; turn < 20; turn++) {
    const message = await client.beta.messages
      .stream({
        model: opts.model,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: opts.effort },
        // Caches the conversation as it grows, on top of the system prompt's own
        // marker. A turn that resumes after a pause re-sends every search result so
        // far; this lets it read them back at the cache rate instead of full price.
        cache_control: { type: "ephemeral" },
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        tools,
        messages,
      })
      .finalMessage();

    addUsage(usage, opts.model, message.usage);
    searches += message.usage.server_tool_use?.web_search_requests ?? 0;
    // One line per request, so a run that goes wrong can be read from the log.
    const blocks = message.content.map((b) =>
      b.type === "tool_use" ? `tool_use:${b.name}` : b.type,
    );
    console.log(
      `  [${opts.finalTool.name} turn ${turn}] ${message.model} stop=${message.stop_reason} searches=${searches} blocks=${[...new Set(blocks)].join(",")}`,
    );

    for (const block of message.content) {
      if (block.type !== "web_fetch_tool_result" || block.content.type !== "web_fetch_result")
        continue;
      const { url, content: doc } = block.content;
      if (doc.source.type === "text") fetched.set(urlKey(url), doc.source.data);
    }

    if (message.stop_reason === "refusal") {
      throw new ModelRefused(`Model refused: ${JSON.stringify(message.stop_details)}`);
    }
    messages.push({ role: "assistant", content: message.content });

    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    const call = toolUses.find((b) => b.name === opts.finalTool.name);
    // Every tool_use must be answered in the next message. A model sometimes calls a tool
    // this run doesn't define (Sonnet 5.5 has asked for code execution by name); it gets
    // an error result naming the real tools, which it usually corrects on its next turn.
    const strayResults: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses
      .filter((b) => b !== call)
      .map((b) => ({
        type: "tool_result",
        tool_use_id: b.id,
        is_error: true,
        content: `There is no tool named "${b.name}" in this run. The only tools are web_search, web_fetch and ${opts.finalTool.name}.`,
      }));
    if (strayResults.length) {
      console.warn(
        `Unknown tool call(s): ${toolUses
          .filter((b) => b !== call)
          .map((b) => b.name)
          .join(", ")}`,
      );
    }
    if (call && searches < (opts.minSearches ?? 0) && searchReminders < 2) {
      searchReminders++;
      console.warn(
        `${opts.finalTool.name} called after ${searches} searches; sending the model back to search.`,
      );
      messages.push({
        role: "user",
        content: [
          ...strayResults,
          {
            type: "tool_result",
            tool_use_id: call.id,
            is_error: true,
            content: `Not accepted: you have made ${searches} web searches. This run exists to search today's news. Call web_search now (you may use up to ${opts.maxSearches}), open the pages you find with web_fetch, and call ${opts.finalTool.name} again only when you have done that.`,
          },
        ],
      });
      continue;
    }
    if (call) {
      const parsed = opts.accept.safeParse(call.input);
      if (parsed.success) return { input: parsed.data, fetched };
      const problem = z.prettifyError(parsed.error);
      if (corrections++ >= 2) {
        const fallback = opts.lenient?.safeParse(call.input);
        if (fallback?.success) return { input: fallback.data, fetched };
        throw new InvalidFinalInput(`${opts.finalTool.name} input still invalid:\n${problem}`);
      }
      console.warn(`${opts.finalTool.name} input invalid, asking for a correction:\n${problem}`);
      messages.push({
        role: "user",
        content: [
          ...strayResults,
          {
            type: "tool_result",
            tool_use_id: call.id,
            is_error: true,
            content: `Not accepted:\n${problem}\nCall ${opts.finalTool.name} again with the complete, corrected input.`,
          },
        ],
      });
      continue;
    }
    if (strayResults.length) {
      messages.push({ role: "user", content: strayResults });
      continue;
    }
    if (message.stop_reason === "pause_turn") continue;
    if (nudged) throw new Error(`Model finished without calling ${opts.finalTool.name}`);
    nudged = true;
    messages.push({
      role: "user",
      content: `Please call ${opts.finalTool.name} now with your results.`,
    });
  }
  throw new Error("Agent loop exceeded 20 turns");
}

// ---------------------------------------------------------------------------
// Checks

const pageCache = new Map<string, Promise<Awaited<ReturnType<typeof fetchPageText>>>>();

async function quoteOnPage(
  url: string,
  quote: string,
  fetched: Map<string, string>,
  /** Vouched-for local newsroom hosts that may be read for this story. */
  alsoAllow: string[],
): Promise<{ ok: boolean; detail: string }> {
  if (!pageCache.has(url)) pageCache.set(url, fetchPageText(url, alsoAllow));
  const direct = await pageCache.get(url)!;
  if (direct.ok && containsQuote(direct.text, quote)) {
    return { ok: true, detail: "found on live page" };
  }
  const viaTool = fetched.get(urlKey(url));
  if (viaTool && containsQuote(viaTool, quote))
    return { ok: true, detail: "found in fetched page" };
  return {
    ok: false,
    detail: direct.ok ? "not found on page" : `couldn't fetch (${direct.reason})`,
  };
}

type Outcome =
  { status: "published"; story: Story } | { status: "rejected" | "deferred"; reason: string };

/** Which parties a political facepalm story may be about today, keeping the tally within one. */
function allowedParties(days: Day[]): string[] {
  const tally = partyBalance(days);
  const d = tally.democratic ?? 0;
  const r = tally.republican ?? 0;
  const parties: string[] = [];
  if (d <= r) parties.push("democratic");
  if (r <= d) parties.push("republican");
  return [...parties, "independent", "other"];
}

async function consider(
  candidate: Candidate,
  side: Side,
  days: Day[],
  bench: BenchEntry[],
  discoveryFetched: Map<string, string>,
): Promise<Outcome> {
  const { corroboration, ...storyInput } = candidate;
  const story = { ...storyInput, side };

  const parsed = DaySchema.shape.genius.safeParse(story);
  if (!parsed.success) {
    return { status: "rejected", reason: `fails the schema: ${z.prettifyError(parsed.error)}` };
  }
  const problems = storyProblems(parsed.data);
  if (problems.length) return { status: "rejected", reason: problems.join("; ") };

  const usedSlugs = new Set([
    ...days.flatMap((d) => SIDES.map((s) => d[s].slug)),
    ...bench.map((b) => b.story.slug),
  ]);
  if (usedSlugs.has(story.slug)) return { status: "rejected", reason: `slug already used` };
  const usedUrls = new Set(
    days.flatMap((d) => SIDES.flatMap((s) => d[s].sources.map((x) => urlKey(x.url)))),
  );
  const reused = story.sources.find((x) => usedUrls.has(urlKey(x.url)));
  if (reused) return { status: "rejected", reason: `source already cited on an earlier day` };

  if (side === "facepalm" && story.party) {
    const party = PartySchema.parse(story.party);
    if (!allowedParties(days).includes(party)) {
      return { status: "deferred", reason: `a ${party} facepalm would unbalance the tally today` };
    }
  }

  const quoteHost = hostOf(story.quote.sourceUrl);
  const corrHost = hostOf(corroboration.sourceUrl);
  if (quoteHost === corrHost) {
    return { status: "rejected", reason: "quote and corroboration come from the same host" };
  }
  if (!story.sources.some((x) => urlKey(x.url) === urlKey(corroboration.sourceUrl))) {
    return { status: "rejected", reason: "corroboration URL isn't among the sources" };
  }

  let verdict: Verdict;
  let fetched = new Map(discoveryFetched);
  try {
    const result = await runAgent({
      model: MODELS.verifier,
      system: VERIFIER_SYSTEM,
      task: verifierTask({ date: DATE, candidate, recent: days.slice(0, 30) }),
      finalTool: SUBMIT_VERDICT,
      accept: VerdictSchema,
      effort: "high",
      maxSearches: 8,
      maxFetches: 12,
    });
    verdict = result.input;
    for (const [k, v] of result.fetched) fetched.set(k, v);
  } catch (err) {
    if (!(err instanceof InvalidFinalInput)) throw err;
    verdict = {
      outcome: "uncertain",
      problems: ["malformed verdict"],
      reasoning: err.message,
      revisions: null,
      score: candidate.score,
      vouchedLocalHosts: [],
    };
  }
  if (verdict.outcome !== "approve") {
    return {
      status: verdict.outcome === "reject" ? "rejected" : "deferred",
      reason: verdict.problems.join("; ") || verdict.reasoning,
    };
  }

  // A local newsroom counts only if the verifier looked at the outlet and vouched for it.
  const vouched = verdict.vouchedLocalHosts.map((h) => h.toLowerCase().replace(/^www\./, ""));
  const localHosts = story.sources.filter((x) => x.local).map((x) => hostOf(x.url));
  const unvouched = localHosts.filter((h) => !vouched.includes(h));
  if (unvouched.length) {
    return {
      status: "rejected",
      reason: `the fact-checker did not vouch for the local newsroom ${unvouched.join(", ")}`,
    };
  }

  // The verifier's score is the one that counts, so the variety rules are applied again.
  const capped = varietyProblem({ ...parsed.data, score: verdict.score }, DATE, days);
  if (capped) return { status: "deferred", reason: capped };

  const q = await quoteOnPage(story.quote.sourceUrl, story.quote.text, fetched, localHosts);
  if (!q.ok) return { status: "deferred", reason: `quote ${q.detail} (${quoteHost})` };
  const c = await quoteOnPage(corroboration.sourceUrl, corroboration.quote, fetched, localHosts);
  if (!c.ok) return { status: "deferred", reason: `corroboration ${c.detail} (${corrHost})` };

  // The verifier may tighten our wording; the result must still pass every mechanical rule.
  let final: Story = { ...parsed.data, score: verdict.score };
  if (verdict.revisions && (verdict.revisions.headline || verdict.revisions.summary)) {
    const revised = DaySchema.shape.genius.safeParse({
      ...final,
      headline: verdict.revisions.headline ?? final.headline,
      summary: verdict.revisions.summary ?? final.summary,
    });
    if (!revised.success) {
      return {
        status: "rejected",
        reason: `revision fails the schema: ${z.prettifyError(revised.error)}`,
      };
    }
    const revisedProblems = storyProblems(revised.data);
    if (revisedProblems.length) return { status: "rejected", reason: revisedProblems.join("; ") };
    console.log(`  revised by the verifier: ${revised.data.headline}`);
    final = revised.data;
  }

  return { status: "published", story: final };
}

// ---------------------------------------------------------------------------

interface SideResult {
  story: Story | null;
  log: ScanLog["candidates"];
}

async function pickSide(
  side: Side,
  raw: unknown[],
  days: Day[],
  bench: BenchEntry[],
  fetched: Map<string, string>,
): Promise<SideResult> {
  const log: ScanLog["candidates"] = [];
  let tries = 0;
  let story: Story | null = null;
  // Facepalm candidates are tried most absurd first, whatever order they arrived in.
  const scoreOf = (item: unknown) => Number((item as { score?: unknown } | null)?.score) || 0;
  const ordered = side === "facepalm" ? [...raw].sort((a, b) => scoreOf(b) - scoreOf(a)) : raw;
  for (const item of ordered) {
    const parsed = CandidateSchema.safeParse(item);
    const headline =
      (item as { headline?: unknown } | null)?.headline?.toString() ?? "(malformed candidate)";
    if (!parsed.success) {
      const why = z.prettifyError(parsed.error).split("\n").slice(0, 3).join(" ");
      log.push({ side, headline, outcome: "rejected", reason: `malformed candidate: ${why}` });
      continue;
    }
    if (story) {
      log.push({ side, headline, outcome: "unused", reason: "an earlier candidate was published" });
      continue;
    }
    // Checked before a verification is spent on it, and again with the verifier's score.
    const blocked = varietyProblem({ ...parsed.data, side }, DATE, days);
    if (blocked) {
      log.push({ side, headline, outcome: "deferred", reason: blocked });
      continue;
    }
    if (tries++ >= MAX_TRIES_PER_SIDE) {
      log.push({ side, headline, outcome: "unused", reason: "over today's verification limit" });
      continue;
    }
    console.log(`Checking ${side}: ${headline}`);
    try {
      const outcome = await consider(parsed.data, side, days, bench, fetched);
      if (outcome.status === "published") {
        story = outcome.story;
        log.push({ side, headline, outcome: "published", reason: "passed every check" });
      } else {
        log.push({ side, headline, outcome: outcome.status, reason: outcome.reason });
      }
    } catch (e) {
      log.push({
        side,
        headline,
        outcome: "deferred",
        reason: `check failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
  return { story, log };
}

async function withArchives(story: Story): Promise<Story> {
  const sources = await Promise.all(
    story.sources.map(async (s) => {
      const archived = await archiveUrl(s.url);
      return archived ? { ...s, archiveUrl: archived } : s;
    }),
  );
  return { ...story, sources };
}

async function main() {
  const startedAt = new Date().toISOString();
  for (const model of new Set([MODELS.discovery, MODELS.verifier])) {
    if (!isPriced(model)) {
      console.warn(`No list price on file for ${model}: its tokens are costed as ${UNPRICED_AS}.`);
    }
  }
  const repo = checkRepo();
  if (repo.errors.length) {
    throw new Error(`Repo is invalid before scanning:\n${repo.errors.join("\n")}`);
  }
  if (repo.days.some((d) => d.date === DATE)) {
    throw new Error(`${DATE} is already published; corrections are made by hand.`);
  }
  const days = [...repo.days].sort((a, b) => b.date.localeCompare(a.date));
  // Bench entries are usable while their event is still inside the window for this date.
  const weekAgo = new Date(Date.parse(DATE) - 7 * 86_400_000).toISOString().slice(0, 10);
  const usable = (b: BenchEntry) => b.story.eventDate >= weekAgo && b.story.eventDate <= DATE;
  const bench = repo.bench;
  const since = new Date(Date.parse(DATE) - 14 * 86_400_000).toISOString().slice(0, 10);
  // Days on both sides of the date, so a backfill run also avoids stories already used later.
  const until = new Date(Date.parse(DATE) + 14 * 86_400_000).toISOString().slice(0, 10);
  const recent = days.filter((d) => d.date >= since && d.date <= until).slice(0, 28);
  // A rerun of the same date starts fresh: its earlier log would only confuse discovery.
  const recentScans = repo.scans.filter((s) => s.date >= since && s.date < DATE);

  // One discovery run per side, each with its own search budget, so neither side can
  // starve the other. Facepalm gets more: it is the harder side to source.
  const budgets: Record<Side, number> = {
    facepalm: Number(process.env.SCAN_MAX_SEARCHES_FACEPALM ?? 60),
    genius: Number(process.env.SCAN_MAX_SEARCHES_GENIUS ?? 45),
  };
  const discoverWith = (side: Side, model: string) => {
    console.log(`Discovery for ${DATE}, ${side} side (${model}, ${budgets[side]} searches)…`);
    return runAgent({
      model,
      system: DISCOVERY_SYSTEM,
      task: discoveryTask({
        date: DATE,
        side,
        maxSearches: budgets[side],
        recent,
        recentScans,
        allowedParties: allowedParties(days),
        bench: bench.filter(usable),
        limits: facepalmLimits(DATE, days),
      }),
      finalTool: SUBMIT_CANDIDATES,
      accept: CorrectableCandidatesSchema,
      lenient: ReceivedCandidatesSchema,
      // Searching is wide, not deep: nothing is published on discovery's word, and the
      // verifier that decides still runs at high effort.
      effort: "medium",
      maxSearches: budgets[side],
      maxFetches: 60,
      minSearches: 5,
    });
  };
  // The discovery model declines in more categories than the verifier model does, and a
  // refusal would otherwise fail the whole scan. One retry on the verifier model keeps the day.
  const discover = async (side: Side) => {
    try {
      return await discoverWith(side, MODELS.discovery);
    } catch (err) {
      if (!(err instanceof ModelRefused) || MODELS.discovery === MODELS.verifier) throw err;
      console.warn(`${err.message}\nRetrying the ${side} side on ${MODELS.verifier}.`);
      return discoverWith(side, MODELS.verifier);
    }
  };
  const [facepalmDiscovery, geniusDiscovery] = await Promise.all([
    discover("facepalm"),
    discover("genius"),
  ]);
  const fetched = new Map([...facepalmDiscovery.fetched, ...geniusDiscovery.fetched]);
  const raw = {
    summary: `Facepalm: ${facepalmDiscovery.input.summary} Genius: ${geniusDiscovery.input.summary}`,
    passed: [...facepalmDiscovery.input.passed, ...geniusDiscovery.input.passed],
  };

  const facepalm = await pickSide(
    "facepalm",
    facepalmDiscovery.input.candidates,
    days,
    bench,
    fetched,
  );
  const genius = await pickSide("genius", geniusDiscovery.input.candidates, days, bench, fetched);

  // A side with no fresh survivor may take the newest usable story from the bench.
  const fromBench: Partial<Record<Side, BenchEntry>> = {};
  for (const side of SIDES) {
    const result = side === "genius" ? genius : facepalm;
    if (result.story) continue;
    const entry = bench
      .filter((b) => b.story.side === side && usable(b) && !varietyProblem(b.story, DATE, days))
      .sort((a, b) => b.verifiedOn.localeCompare(a.verifiedOn))[0];
    if (!entry) continue;
    result.story = entry.story;
    fromBench[side] = entry;
    result.log.push({
      side,
      headline: entry.story.headline,
      outcome: "published",
      reason: `from the bench (verified ${entry.verifiedOn})`,
    });
  }
  const published = Boolean(genius.story && facepalm.story);

  // A verified story with no partner goes to the bench for a later day.
  const benched: BenchEntry[] = [];
  if (!published) {
    for (const side of SIDES) {
      const result = side === "genius" ? genius : facepalm;
      if (!result.story || fromBench[side]) continue;
      benched.push({ story: result.story, verifiedOn: DATE });
      const entry = result.log.find((c) => c.outcome === "published");
      if (entry) {
        entry.outcome = "benched";
        entry.reason =
          "passed every check; kept for a later day because the other side had no story";
      }
    }
  }
  // A bench entry leaves the bench only when it is actually published; a day that
  // borrowed it and still found no partner must leave it for the next day.
  const usedSlugs = new Set(published ? Object.values(fromBench).map((b) => b.story.slug) : []);
  // Prune only entries whose event is more than a week before this date. An entry whose
  // event is after a backfill date must survive for the live scans that can still use it.
  const keep = (b: BenchEntry) => b.story.eventDate >= weekAgo;
  const nextBench = [...bench.filter((b) => !usedSlugs.has(b.story.slug) && keep(b)), ...benched];

  let day: Day | null = null;
  if (genius.story && facepalm.story) {
    day = DaySchema.parse({
      date: DATE,
      genius: DRY_RUN ? genius.story : await withArchives(genius.story),
      facepalm: DRY_RUN ? facepalm.story : await withArchives(facepalm.story),
      publishedAt: new Date().toISOString(),
      model: modelLabel(MODELS),
      history: [
        { date: new Date().toISOString().slice(0, 10), change: "Published by the daily scan." },
      ],
    });
  }

  const candidates = [
    ...genius.log,
    ...facepalm.log,
    ...raw.passed.map((p) => ({ ...p, outcome: "rejected" as const })),
  ];
  const missing = SIDES.filter((s) => !(s === "genius" ? genius.story : facepalm.story));
  const benchNote = benched.length
    ? ` The verified ${benched.map((b) => b.story.side).join(" and ")} story is on the bench for a later day.`
    : "";
  const summary = published
    ? `${raw.summary} Pair published.`
    : `${raw.summary} No ${missing.join(" or ")} story met the standard; nothing published.${benchNote}`;
  const log: ScanLog = ScanLogSchema.parse({
    date: DATE,
    startedAt,
    finishedAt: new Date().toISOString(),
    model: modelLabel(MODELS),
    searches: totals(usage).searches,
    summary,
    published,
    candidates,
  });

  const report = [
    `## Scan ${DATE}`,
    "",
    summary,
    "",
    ...(day
      ? [
          `**Genius:** ${day.genius.headline} (${day.genius.state})`,
          `**Facepalm:** ${day.facepalm.headline} (${day.facepalm.state})`,
          "",
        ]
      : []),
    "### Candidates",
    ...candidates.map((c) => `- ${c.side} · ${c.outcome}: ${c.headline} — ${c.reason}`),
    "",
    ...costFooter(MODELS, usage),
    ...(NOTIFY && !published ? ["", `cc ${NOTIFY}: no pair today.`] : []),
  ].join("\n");
  console.log(`\n${report}\n`);

  if (DRY_RUN) {
    if (day) console.log(canonicalJson(day));
    console.log("Dry run: nothing written.");
    return;
  }
  if (day) writeJson(dayFile(DATE), day);
  writeJson(scanFile(DATE), log);
  writeJson(BENCH_FILE, BenchSchema.parse(nextBench));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const title = day
    ? `scan: ${DATE}, ${day.genius.slug} / ${day.facepalm.slug}`
    : `scan: ${DATE}, no pair`;
  fs.writeFileSync(path.join(OUT_DIR, "title.txt"), title.slice(0, 250) + "\n");
  fs.writeFileSync(path.join(OUT_DIR, "pr-body.md"), report + "\n");

  const after = checkRepo();
  if (after.errors.length) {
    throw new Error(`Repo is invalid after writing:\n${after.errors.join("\n")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
