/**
 * Asks the Wayback Machine to capture a source page, so every citation has a
 * copy that outlives the original. Best effort: a failure never blocks
 * publishing, and the stored link resolves to the nearest capture either way.
 */
const USER_AGENT = "americaisnotreal-archiver/1.0 (+https://americaisnotreal.com/methodology)";

function stamp(date = new Date()): string {
  return date.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

export async function archiveUrl(url: string): Promise<string> {
  const fallback = `https://web.archive.org/web/${stamp()}/${url}`;
  try {
    const res = await fetch(`https://web.archive.org/save/${url}`, {
      method: "GET",
      headers: { "user-agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(45_000),
    });
    const location = res.headers.get("content-location") ?? res.headers.get("location");
    if (location?.startsWith("/web/")) return `https://web.archive.org${location}`;
    if (res.url.includes("/web/") && res.url.includes("web.archive.org")) return res.url;
  } catch {
    // The Wayback Machine is often slow or rate-limited; the fallback still resolves.
  }
  return fallback;
}
