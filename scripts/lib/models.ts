/**
 * Which Claude model does which job in the scan, what each one's usage costs, and the
 * cost footer of the scan PR. Pure (no SDK, no I/O) so it can be tested; scan.ts does
 * the calling.
 *
 * The footer is the only cost record: past totals are read back out of merged scan PRs,
 * so its first line keeps the `N searches · N fetches · ~$X` segments in exactly that form.
 */

/** Discovery proposes candidates, one run per side; the verifier is the adversarial review. */
export const DEFAULT_DISCOVERY_MODEL = "claude-sonnet-5-5";
export const DEFAULT_VERIFIER_MODEL = "claude-opus-5-5";

export interface ScanModels {
  discovery: string;
  verifier: string;
}

/**
 * SCAN_DISCOVERY_MODEL / SCAN_VERIFIER_MODEL override the defaults. An unset GitHub
 * repository variable reaches the workflow step as an empty string, so empty (or blank)
 * means unset here: `||`, not `??`.
 */
export function resolveModels(env: Record<string, string | undefined>): ScanModels {
  return {
    discovery: env.SCAN_DISCOVERY_MODEL?.trim() || DEFAULT_DISCOVERY_MODEL,
    verifier: env.SCAN_VERIFIER_MODEL?.trim() || DEFAULT_VERIFIER_MODEL,
  };
}

/**
 * The `model` string written to day files and scan logs, and shown on /log. One id when a
 * single model did both jobs (the form every log before the split has); otherwise both,
 * each with its job.
 */
export function modelLabel({ discovery, verifier }: ScanModels): string {
  return discovery === verifier ? discovery : `${discovery} (discovery), ${verifier} (verifier)`;
}

/** US dollars per million tokens. */
export interface Rates {
  input: number;
  output: number;
  cacheRead: number;
  /** Five-minute cache writes, the only kind the scan makes. */
  cacheWrite: number;
}

/** List prices, checked against the Anthropic pricing page on 2026-11-14. */
export const PRICES: Record<string, Rates> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
};

/** A model with no entry in PRICES is priced at this model's rates, and the footer says so. */
export const UNPRICED_AS = "claude-opus-5-5";

/** Web search is billed per search whatever the model; web fetch has no fee. */
export const SEARCH_PRICE = 0.01;

export function isPriced(model: string): boolean {
  return Object.hasOwn(PRICES, model);
}

export interface ModelUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  searches: number;
  fetches: number;
}

export type UsageByModel = Map<string, ModelUsage>;

/** The fields of an API response's `usage` that the scan counts. */
export interface ResponseUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: {
    web_search_requests?: number | null;
    web_fetch_requests?: number | null;
  } | null;
}

function emptyUsage(): ModelUsage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0 };
}

/**
 * Adds one response's usage to its model's running total. Synchronous from lookup to
 * write, so the discovery runs that share a map under Promise.all can't lose an update.
 */
export function addUsage(byModel: UsageByModel, model: string, usage: ResponseUsage): void {
  const total = byModel.get(model) ?? emptyUsage();
  total.input += usage.input_tokens;
  total.output += usage.output_tokens;
  total.cacheRead += usage.cache_read_input_tokens ?? 0;
  total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
  total.searches += usage.server_tool_use?.web_search_requests ?? 0;
  total.fetches += usage.server_tool_use?.web_fetch_requests ?? 0;
  byModel.set(model, total);
}

/** What one model's tokens cost, in dollars, at its own rates (searches are counted apart). */
export function tokenCost(model: string, usage: ModelUsage): number {
  const rates = PRICES[isPriced(model) ? model : UNPRICED_AS]!;
  return (
    (usage.input * rates.input +
      usage.output * rates.output +
      usage.cacheRead * rates.cacheRead +
      usage.cacheWrite * rates.cacheWrite) /
    1e6
  );
}

export interface ScanTotals {
  searches: number;
  fetches: number;
  /** Tokens for every model at its own rates, plus searches. */
  cost: number;
}

export function totals(byModel: UsageByModel): ScanTotals {
  let searches = 0;
  let fetches = 0;
  let cost = 0;
  for (const [model, usage] of byModel) {
    searches += usage.searches;
    fetches += usage.fetches;
    cost += tokenCost(model, usage);
  }
  return { searches, fetches, cost: cost + searches * SEARCH_PRICE };
}

/**
 * The footer of the scan PR body: the totals line, then one line per model with its token
 * split and what those tokens cost. Only the first line carries "searches", "fetches" and
 * "~$", so anything reading totals back out of a PR body finds exactly one of each.
 */
export function costFooter(models: ScanModels, byModel: UsageByModel): string[] {
  const { searches, fetches, cost } = totals(byModel);
  // Configured models first, in job order, even when one never ran; then anything else.
  const order = [...new Set([models.discovery, models.verifier, ...byModel.keys()])];
  return [
    `<sub>${modelLabel(models)} · ${searches} searches · ${fetches} fetches · ~$${cost.toFixed(2)}</sub>`,
    ...order.map((model) => {
      const u = byModel.get(model) ?? emptyUsage();
      const note = isPriced(model) ? "" : ` (no list price on file; priced as ${UNPRICED_AS})`;
      return `<sub>${model} tokens: ${u.input} input · ${u.output} output · ${u.cacheRead} cache read · ${u.cacheWrite} cache write · $${tokenCost(model, u).toFixed(2)}${note}</sub>`;
    }),
  ];
}
