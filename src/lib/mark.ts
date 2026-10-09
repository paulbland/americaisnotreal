/**
 * The site mark: a rounded tile split down the middle, genius blue on the left
 * and facepalm orange on the right, with a hairline of paper between them. Drawn
 * by hand so no icon depends on a font.
 */
import { Resvg } from "@resvg/resvg-js";

const COLORS = {
  light: { left: "#1d4ed8", right: "#c2410c", gap: "#f5f2eb" },
  dark: { left: "#8fb0ff", right: "#ff9a63", gap: "#121110" },
};

function tile(c: { left: string; right: string; gap: string }, radius: number): string {
  // Two halves clipped to one rounded rect; the gap is a 2-unit stripe of paper.
  return (
    `<clipPath id="r"><rect width="32" height="32" rx="${radius}"/></clipPath>` +
    `<g clip-path="url(#r)">` +
    `<rect width="16" height="32" fill="${c.left}"/>` +
    `<rect x="16" width="16" height="32" fill="${c.right}"/>` +
    `<rect x="15" width="2" height="32" fill="${c.gap}"/>` +
    `</g>`
  );
}

/** favicon.svg, which follows the browser's light or dark theme. */
export function faviconSvg(): string {
  const { light: l, dark: d } = COLORS;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<style>.l{fill:${l.left}}.r{fill:${l.right}}.g{fill:${l.gap}}` +
    `@media (prefers-color-scheme:dark){.l{fill:${d.left}}.r{fill:${d.right}}.g{fill:${d.gap}}}</style>` +
    `<clipPath id="r"><rect width="32" height="32" rx="7"/></clipPath>` +
    `<g clip-path="url(#r)"><rect class="l" width="16" height="32"/>` +
    `<rect class="r" x="16" width="16" height="32"/><rect class="g" x="15" width="2" height="32"/></g></svg>\n`
  );
}

export interface MarkOptions {
  /** Corner radius as a share of the icon; 0 where the platform applies its own mask. */
  radius?: number;
}

/** A PNG of the mark in its light-theme colours. */
export function renderMark(
  size: number,
  { radius = 7 / 32 }: MarkOptions = {},
): Uint8Array<ArrayBuffer> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    tile(COLORS.light, radius * 32) +
    `</svg>`;
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng());
}

/** Packs PNGs into a .ico file (PNG entries, which every current browser reads). */
export function ico(images: { size: number; png: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const HEADER = 6;
  const ENTRY = 16;
  const out = new Uint8Array(
    HEADER + ENTRY * images.length + images.reduce((n, i) => n + i.png.length, 0),
  );
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  let offset = HEADER + ENTRY * images.length;
  images.forEach(({ size, png }, i) => {
    const e = HEADER + ENTRY * i;
    out[e] = size >= 256 ? 0 : size;
    out[e + 1] = size >= 256 ? 0 : size;
    view.setUint16(e + 4, 1, true);
    view.setUint16(e + 6, 32, true);
    view.setUint32(e + 8, png.length, true);
    view.setUint32(e + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}
