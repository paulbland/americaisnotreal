/**
 * Asks the Wayback Machine to capture a source page, so every citation has a
 * copy that outlives the original. Best effort: a failure never blocks
 * publishing, and a link is stored only when a capture is confirmed, so the
 * site never shows an "archived" link that 404s.
 */
const USER_AGENT = "americaisnotreal-archiver/1.0 (+https://americaisnotreal.com/methodology)";

/** The capture's URL, or null if the Wayback Machine didn't confirm one in time. */
export async function archiveUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://web.archive.org/save/${url}`, {
      method: "GET",
      headers: { "user-agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(150_000),
    });
    const location = res.headers.get("content-location");
    if (location?.startsWith("/web/")) return `https://web.archive.org${location}`;
    if (res.ok && res.url.includes("web.archive.org/web/")) return res.url;
  } catch {
    // Slow or rate-limited; the source link itself still works.
  }
  return null;
}
