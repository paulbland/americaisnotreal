/** Filesystem access to the data files, for Node scripts (Astro uses src/lib/data.ts). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const DAYS_DIR = path.join(ROOT, "src", "data", "days");
export const SCANS_DIR = path.join(ROOT, "src", "data", "scans");
export const BENCH_FILE = path.join(ROOT, "src", "data", "bench.json");

/** The one serialisation every data file must use, so diffs stay minimal. */
export function canonicalJson(data: unknown): string {
  return JSON.stringify(data, null, 2) + "\n";
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canonicalJson(data));
}

export interface DataFile {
  file: string;
  name: string;
  text: string;
  json: unknown;
}

export function readDir(dir: string): DataFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const file = path.join(dir, f);
      const text = fs.readFileSync(file, "utf8");
      return { file, name: f.replace(/\.json$/, ""), text, json: JSON.parse(text) };
    });
}

export function dayFile(date: string): string {
  return path.join(DAYS_DIR, `${date}.json`);
}

export function scanFile(date: string): string {
  return path.join(SCANS_DIR, `${date}.json`);
}
