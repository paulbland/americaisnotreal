/**
 * Runs the scan for a range of past dates, so the archive isn't empty at launch.
 *
 *   node scripts/backfill.ts --from=2026-09-25 --to=2026-10-08 [--concurrency=2]
 *
 * Each date runs as its own `scripts/scan.ts --date=…` process; a date that is
 * already published is skipped. Days are written straight to src/data, so
 * review the diff before committing.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { dayFile } from "./lib/files.ts";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const from = arg("from");
const to = arg("to") ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const concurrency = Number(arg("concurrency") ?? 2);
if (!from) throw new Error("--from=YYYY-MM-DD is required");

const dates: string[] = [];
for (let t = Date.parse(from); t <= Date.parse(to); t += 86_400_000) {
  const d = new Date(t).toISOString().slice(0, 10);
  if (!fs.existsSync(dayFile(d))) dates.push(d);
}
console.log(`Backfilling ${dates.length} day(s): ${dates.join(", ")}`);

function runOne(date: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("node", ["scripts/scan.ts", `--date=${date}`], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    const prefix = (s: string) =>
      s
        .split("\n")
        .filter(Boolean)
        .map((l) => `[${date}] ${l}`)
        .join("\n");
    child.stdout.on("data", (b) => console.log(prefix(String(b))));
    child.stderr.on("data", (b) => console.error(prefix(String(b))));
    child.on("close", (code) => resolve(code === 0));
  });
}

const queue = [...dates];
const results: Record<string, boolean> = {};
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let d = queue.shift(); d; d = queue.shift()) results[d] = await runOne(d);
  }),
);
for (const [d, ok] of Object.entries(results)) {
  console.log(`${ok ? "✓" : "✗"} ${d}${fs.existsSync(dayFile(d)) ? " (published)" : " (no pair)"}`);
}
