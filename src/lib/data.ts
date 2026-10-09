/**
 * Loads and validates every data file at build time (Vite only; the Node
 * scripts use scripts/lib/files.ts). An invalid file fails the build.
 */
import { z } from "zod";
import { DaySchema, ScanLogSchema, type Day, type ScanLog } from "../data/schema.ts";

function parseFile<T>(schema: z.ZodType<T>, path: string, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(`${path}\n${z.prettifyError(result.error)}`);
  return result.data;
}

const basename = (path: string) =>
  path
    .split("/")
    .pop()!
    .replace(/\.json$/, "");

const dayFiles = import.meta.glob<unknown>("../data/days/*.json", {
  eager: true,
  import: "default",
});

/** Newest first. */
export const days: Day[] = Object.entries(dayFiles)
  .map(([path, raw]) => {
    const d = parseFile(DaySchema, path, raw);
    if (d.date !== basename(path)) throw new Error(`${path}: date "${d.date}" ≠ filename`);
    return d;
  })
  .sort((a, b) => b.date.localeCompare(a.date));

const scanFiles = import.meta.glob<unknown>("../data/scans/*.json", {
  eager: true,
  import: "default",
});

/** Newest first. */
export const scans: ScanLog[] = Object.entries(scanFiles)
  .map(([path, raw]) => {
    const s = parseFile(ScanLogSchema, path, raw);
    if (s.date !== basename(path)) throw new Error(`${path}: date "${s.date}" ≠ filename`);
    return s;
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export const latest: Day | undefined = days[0];

/** The date the news was last checked, whether or not a pair was published. */
export const asOf: string = scans[0]?.date ?? latest?.date ?? new Date().toISOString().slice(0, 10);

export function dayByDate(date: string): Day | undefined {
  return days.find((d) => d.date === date);
}

/** The published day before and after a date, for prev/next links. */
export function neighbours(date: string): { prev?: Day; next?: Day } {
  const i = days.findIndex((d) => d.date === date);
  if (i === -1) return {};
  return { prev: days[i + 1], next: days[i - 1] };
}
