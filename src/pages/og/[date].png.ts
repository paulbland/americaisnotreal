import type { APIRoute, GetStaticPaths } from "astro";
import type { Day } from "../../data/schema.ts";
import { days } from "../../lib/data.ts";
import { renderDayOg } from "../../lib/og.ts";

export const getStaticPaths = (() =>
  days.map((day) => ({ params: { date: day.date }, props: { day } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderDayOg(props.day as Day);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
