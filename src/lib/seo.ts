/**
 * Titles, descriptions and JSON-LD, computed from the data so nothing is ever
 * hand-written out of date.
 */
import type { Day, Story } from "../data/schema.ts";
import { formatDate, plural } from "./format.ts";
import { LABELS, SITE } from "./site.ts";
import { place } from "./states.ts";

export function dayPath(d: Day | string): string {
  return `/${typeof d === "string" ? d : d.date}`;
}

export function dayTitle(d: Day): string {
  return `${formatDate(d.date)}: ${d.genius.headline} / ${d.facepalm.headline}`;
}

export function dayDescription(d: Day): string {
  return `${LABELS.genius}: ${d.genius.headline} (${place(d.genius.city, d.genius.state)}). ${LABELS.facepalm}: ${d.facepalm.headline} (${place(d.facepalm.city, d.facepalm.state)}). Two true stories from the same country on the same day, with sources.`;
}

export function homeDescription(days: Day[]): string {
  const latest = days[0];
  if (!latest) return SITE.description;
  return `Today: ${latest.genius.headline}, and ${latest.facepalm.headline}. ${SITE.description}`;
}

export function storyLd(s: Story, d: Day): object {
  return {
    "@type": "NewsArticle",
    headline: s.headline,
    description: s.summary,
    datePublished: d.publishedAt,
    dateModified: d.publishedAt,
    url: new URL(`${dayPath(d)}#${s.side}`, SITE.url).href,
    about: s.category,
    contentLocation: { "@type": "Place", name: place(s.city, s.state) },
    citation: s.sources.map((src) => ({
      "@type": "CreativeWork",
      name: src.title,
      url: src.url,
      publisher: { "@type": "Organization", name: src.publisher },
      ...(src.date ? { datePublished: src.date } : {}),
    })),
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    isAccessibleForFree: true,
  };
}

export function dayLd(d: Day): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: dayTitle(d),
      description: dayDescription(d),
      url: new URL(dayPath(d), SITE.url).href,
      itemListOrder: "https://schema.org/ItemListUnordered",
      numberOfItems: 2,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: LABELS.genius, item: storyLd(d.genius, d) },
        { "@type": "ListItem", position: 2, name: LABELS.facepalm, item: storyLd(d.facepalm, d) },
      ],
    },
  ];
}

export function websiteLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.tagline,
    url: SITE.url,
    description: SITE.description,
    inLanguage: "en-US",
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: new URL(it.path, SITE.url).href,
    })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function countLine(days: Day[]): string {
  return `${plural(days.length, "day")}, ${plural(days.length * 2, "story", "stories")}`;
}
