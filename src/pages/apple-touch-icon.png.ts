import type { APIRoute } from "astro";
import { renderMark } from "../lib/mark.ts";

// iOS rounds the corners itself.
export const GET: APIRoute = () =>
  new Response(renderMark(180, { radius: 0 }), { headers: { "Content-Type": "image/png" } });
