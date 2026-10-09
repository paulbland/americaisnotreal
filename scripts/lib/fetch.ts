/** Fetches a cited page ourselves, so quote checks don't rely on any model's word. */
import { hostOf, htmlToText, sourceAllowed } from "./verify.ts";

export type PageText = { ok: true; text: string; finalUrl: string } | { ok: false; reason: string };

const USER_AGENT =
  "Mozilla/5.0 (compatible; americaisnotreal-verifier/1.0; +https://americaisnotreal.com/methodology)";

export async function fetchPageText(url: string): Promise<PageText> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    if (!sourceAllowed(res.url)) {
      return { ok: false, reason: `ended on an unaccepted host (${hostOf(res.url)})` };
    }
    return { ok: true, text: htmlToText(await res.text()), finalUrl: res.url };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Compare URLs ignoring scheme, www, fragment and a trailing slash. */
export function urlKey(url: string): string {
  const u = new URL(url);
  u.hash = "";
  return u.href
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}
