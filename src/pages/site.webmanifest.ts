import type { APIRoute } from "astro";
import { SITE } from "../lib/site.ts";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: SITE.name,
        short_name: "Not Real",
        description: SITE.description,
        start_url: "/",
        display: "browser",
        background_color: "#f5f2eb",
        theme_color: "#f5f2eb",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      null,
      2,
    ),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
