import type { APIRoute } from "astro";
import { latest } from "../../lib/data.ts";
import { renderHomeOg } from "../../lib/og.ts";

export const GET: APIRoute = async () =>
  new Response(await renderHomeOg(latest), { headers: { "Content-Type": "image/png" } });
