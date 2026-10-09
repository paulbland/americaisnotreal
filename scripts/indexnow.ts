/**
 * Tells IndexNow search engines (Bing and, through it, Copilot and ChatGPT
 * search; Yandex; Seznam; Naver) which pages changed. Google doesn't use
 * IndexNow; it reads the sitemap.
 *
 *   node scripts/indexnow.ts        today's pages (run by the daily scan after merge)
 *   node scripts/indexnow.ts --all  every URL in the live sitemap (use once at launch)
 *
 * Waits for the deploy to go live first, and never fails the workflow.
 */
import fs from "node:fs";
import path from "node:path";
import { SITE } from "../src/lib/site.ts";
import { dayFile, ROOT } from "./lib/files.ts";

const KEY = fs.readFileSync(path.join(ROOT, "public", "indexnow.txt"), "utf8").trim();
const DATE =
  process.argv.find((a) => a.startsWith("--date="))?.slice(7) ??
  new Date().toISOString().slice(0, 10);
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

async function sitemapUrls(): Promise<string[]> {
  const index = await (await fetch(`${SITE.url}/sitemap-index.xml`)).text();
  const urls: string[] = [];
  for (const map of locs(index)) urls.push(...locs(await (await fetch(map)).text()));
  return urls;
}

function todaysUrls(): string[] {
  const paths = ["/", "/archive", "/log"];
  if (fs.existsSync(dayFile(DATE))) paths.push(`/${DATE}`);
  return paths.map((p) => new URL(p, SITE.url).href);
}

/** The scan's merge triggers a deploy; wait until the live site shows today's scan. */
async function waitForDeploy(): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    try {
      const live = (await (await fetch(`${SITE.url}/days.json`, { cache: "no-store" })).json()) as {
        lastChecked?: string;
      };
      if (live.lastChecked === DATE) return true;
    } catch {
      // not deployed yet, or a transient error
    }
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return false;
}

async function main() {
  const all = process.argv.includes("--all");
  if (!all && !(await waitForDeploy())) {
    console.log("Live site doesn't show today's scan yet; skipping IndexNow.");
    return;
  }
  const urlList = all ? await sitemapUrls() : todaysUrls();
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: SITE.domain,
      key: KEY,
      keyLocation: `${SITE.url}/indexnow.txt`,
      urlList,
    }),
  });
  console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
}

main().catch((e) => console.log(`IndexNow failed (ignored): ${e}`));
