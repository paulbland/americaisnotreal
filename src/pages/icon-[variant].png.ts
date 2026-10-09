import type { APIRoute, GetStaticPaths } from "astro";
import { renderMark } from "../lib/mark.ts";

export const getStaticPaths = (() => [
  { params: { variant: "192" }, props: { size: 192, radius: 7 / 32 } },
  { params: { variant: "512" }, props: { size: 512, radius: 7 / 32 } },
  // Maskable: square, the platform applies its own mask.
  { params: { variant: "maskable" }, props: { size: 512, radius: 0 } },
]) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(renderMark(props.size as number, { radius: props.radius as number }), {
    headers: { "Content-Type": "image/png" },
  });
