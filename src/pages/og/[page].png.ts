import type { APIRoute, GetStaticPaths } from "astro";
import { CATEGORIES, STATE_CODES } from "../../data/schema.ts";
import { CATEGORY_LABELS } from "../../lib/categories.ts";
import { days } from "../../lib/data.ts";
import { renderTitleOg } from "../../lib/og.ts";
import { countLine } from "../../lib/seo.ts";
import { SITE } from "../../lib/site.ts";
import { stateName, stateSlug } from "../../lib/states.ts";

const usedStates = new Set(days.flatMap((d) => [d.genius.state, d.facepalm.state]));
const usedCategories = new Set(days.flatMap((d) => [d.genius.category, d.facepalm.category]));

const page = (slug: string, title: string, subtitle: string) => ({
  params: { page: slug },
  props: { title, subtitle },
});

export const getStaticPaths = (() => [
  page("archive", "Archive", countLine(days)),
  page("genius", "Genius", "What people here are capable of"),
  page("facepalm", "Facepalm", "What they are also capable of"),
  page("states", "By state", "Where the stories come from"),
  page("categories", "By category", "What the stories are about"),
  page("log", "Scan log", "Every candidate, and why"),
  page("methodology", "Methodology", "How stories are chosen and checked"),
  page("about", "About", SITE.tagline),
  ...STATE_CODES.filter((c) => usedStates.has(c)).map((c) =>
    page(`state-${stateSlug(c)}`, stateName(c), "Genius and facepalm, by state"),
  ),
  ...CATEGORIES.filter((c) => usedCategories.has(c)).map((c) =>
    page(`category-${c}`, CATEGORY_LABELS[c], "Genius and facepalm, by category"),
  ),
]) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderTitleOg(props.title as string, props.subtitle as string);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
