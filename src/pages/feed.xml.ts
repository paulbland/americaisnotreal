import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { days } from "../lib/data.ts";
import { formatDate } from "../lib/format.ts";
import { dayPath } from "../lib/seo.ts";
import { LABELS, SITE } from "../lib/site.ts";
import { place } from "../lib/states.ts";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One item per day, newest first, with both stories and their sources in the body. */
export const GET: APIRoute = () =>
  rss({
    title: SITE.name,
    description: SITE.description,
    site: SITE.url,
    customData: "<language>en-us</language>",
    items: days.map((d) => ({
      title: `${formatDate(d.date)}: ${d.genius.headline} / ${d.facepalm.headline}`,
      link: dayPath(d),
      pubDate: new Date(d.publishedAt),
      description: `${LABELS.genius}: ${d.genius.headline}. ${LABELS.facepalm}: ${d.facepalm.headline}.`,
      content: [d.genius, d.facepalm]
        .map(
          (s) =>
            `<h2>${escape(LABELS[s.side])}: ${escape(s.headline)}</h2>` +
            `<p><em>${escape(place(s.city, s.state))}</em></p>` +
            `<p>${escape(s.summary)}</p>` +
            `<blockquote>${escape(s.quote.text)}</blockquote>` +
            `<ul>${s.sources.map((x) => `<li><a href="${escape(x.url)}">${escape(x.publisher)}: ${escape(x.title)}</a></li>`).join("")}</ul>`,
        )
        .join(""),
    })),
  });
