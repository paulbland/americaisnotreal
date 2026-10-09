import fs from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const dates = fs
  .readdirSync("src/data/days")
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();
const lastChecked =
  fs
    .readdirSync("src/data/scans")
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort()
    .at(-1) ??
  dates.at(-1) ??
  new Date().toISOString().slice(0, 10);

export default defineConfig({
  site: "https://americaisnotreal.com",
  output: "static",
  trailingSlash: "never",
  // Astro 7 defaults to compressHTML: "jsx", which strips whitespace between
  // inline elements. `true` keeps HTML-aware handling.
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/og/"),
      serialize: (item) => {
        // A day page never changes after it's published; everything else moves daily.
        const date = item.url.match(/\/(\d{4}-\d{2}-\d{2})$/)?.[1];
        return { ...item, lastmod: date ?? lastChecked };
      },
    }),
  ],
});
