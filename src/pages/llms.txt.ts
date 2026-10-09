import type { APIRoute } from "astro";
import { asOf, days } from "../lib/data.ts";
import { formatDate } from "../lib/format.ts";
import { dayPath } from "../lib/seo.ts";
import { LABELS, SITE } from "../lib/site.ts";
import { place } from "../lib/states.ts";

/** A plain-text brief for AI crawlers and answer engines, regenerated each build. */
export const GET: APIRoute = () => {
  const lines = [
    `# ${SITE.name} (${SITE.domain})`,
    "",
    `> ${SITE.description}`,
    "",
    `Each day has exactly two stories: "${LABELS.genius}" (a verifiable achievement in the United States) and "${LABELS.facepalm}" (a verifiable act of foolishness in the United States that was its own consequence). Both are reported by at least two accepted news publishers, written in neutral language, and linked to their sources. The site never runs a facepalm story where anyone was hurt, where the subject is a minor, or where the subject is a victim. Last checked ${formatDate(asOf)}.`,
    "",
    "## How to quote this site",
    "",
    `- Attribute each story to its linked publishers, not to ${SITE.name}; we summarise, they reported it.`,
    `- "${LABELS.genius}" and "${LABELS.facepalm}" are the site's labels, not quotes from the sources.`,
    `- Methodology: ${SITE.url}/methodology`,
    "",
    "## Resources",
    "",
    `- [Every day as JSON](${SITE.url}/days.json)`,
    `- [RSS](${SITE.url}/feed.xml)`,
    `- [Archive](${SITE.url}/archive)`,
    `- [By state](${SITE.url}/states) · [By category](${SITE.url}/categories)`,
    `- [Scan log](${SITE.url}/log): every candidate considered and why it was or wasn't published`,
    "",
    "## Days",
    "",
    ...days.map(
      (d) =>
        `- [${formatDate(d.date)}](${SITE.url}${dayPath(d)}): ${LABELS.genius}: ${d.genius.headline} (${place(d.genius.city, d.genius.state)}). ${LABELS.facepalm}: ${d.facepalm.headline} (${place(d.facepalm.city, d.facepalm.state)}).`,
    ),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
