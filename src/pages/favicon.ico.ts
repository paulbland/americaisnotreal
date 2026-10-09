import type { APIRoute } from "astro";
import { ico, renderMark } from "../lib/mark.ts";

export const GET: APIRoute = () => {
  const images = [16, 32, 48].map((size) => ({ size, png: renderMark(size) }));
  return new Response(ico(images), { headers: { "Content-Type": "image/x-icon" } });
};
