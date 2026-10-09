import type { APIRoute } from "astro";
import { asOf, days } from "../lib/data.ts";
import { SITE } from "../lib/site.ts";

/** The whole dataset, for anyone who wants it. `lastChecked` is also what the deploy wait reads. */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        site: SITE.url,
        license: SITE.license.url,
        lastChecked: asOf,
        count: days.length,
        days,
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
