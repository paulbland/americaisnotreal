/**
 * 1200×630 share images, rendered at build time with satori + resvg. Fixed
 * light palette: social platforms don't theme images. A day's image is the
 * pair itself, split down the middle.
 */
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { Day } from "../data/schema.ts";
import { formatDate } from "./format.ts";
import { SITE, LABELS } from "./site.ts";
import { place } from "./states.ts";

const W = 1200;
const H = 630;
const C = {
  bg: "#f5f2eb",
  ink: "#15130f",
  muted: "#5d584e",
  rule: "#d8d2c4",
  genius: "#1d4ed8",
  facepalm: "#c2410c",
};

const fontDir = path.join(process.cwd(), "node_modules", "@fontsource", "fraunces", "files");
const fonts = ([400, 500, 600] as const).map((weight) => ({
  name: "Fraunces",
  weight,
  style: "normal" as const,
  data: fs.readFileSync(path.join(fontDir, `fraunces-latin-${weight}-normal.woff`)),
}));

type Node = { type: string; props: Record<string, unknown> };
const el = (style: Record<string, unknown>, children?: unknown): Node => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

async function render(node: Node): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await satori(node as never, { width: W, height: H, fonts });
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng());
}

function footer(right: string): Node {
  return el(
    {
      justifyContent: "space-between",
      fontSize: 24,
      color: C.muted,
      borderTop: `1px solid ${C.rule}`,
      paddingTop: 16,
      marginTop: 16,
    },
    [el({}, SITE.domain), el({}, right)],
  );
}

function column(
  label: string,
  color: string,
  headline: string,
  where: string,
  extra: Record<string, unknown>,
): Node {
  return el(
    {
      flexDirection: "column",
      flex: 1,
      padding: "28px 36px 0",
      borderTop: `10px solid ${color}`,
      ...extra,
    },
    [
      el({ fontSize: 22, letterSpacing: 3, color, fontWeight: 600 }, label.toUpperCase()),
      el(
        {
          fontSize: headline.length > 70 ? 36 : 42,
          fontWeight: 500,
          lineHeight: 1.15,
          marginTop: 14,
        },
        headline,
      ),
      el({ fontSize: 22, color: C.muted, marginTop: 14 }, where),
    ],
  );
}

export function renderDayOg(d: Day): Promise<Uint8Array<ArrayBuffer>> {
  return render(
    el(
      {
        width: W,
        height: H,
        flexDirection: "column",
        backgroundColor: C.bg,
        color: C.ink,
        fontFamily: "Fraunces",
        padding: "44px 48px 36px",
      },
      [
        el({ justifyContent: "space-between", alignItems: "baseline" }, [
          el({ fontSize: 30, fontWeight: 600 }, SITE.name),
          el({ fontSize: 26, color: C.muted }, formatDate(d.date)),
        ]),
        el({ flex: 1, marginTop: 28, gap: 0 }, [
          column(LABELS.genius, C.genius, d.genius.headline, place(d.genius.city, d.genius.state), {
            paddingLeft: 0,
          }),
          column(
            LABELS.facepalm,
            C.facepalm,
            d.facepalm.headline,
            place(d.facepalm.city, d.facepalm.state),
            { borderLeft: `1px solid ${C.rule}` },
          ),
        ]),
        footer(SITE.tagline),
      ],
    ),
  );
}

export function renderHomeOg(latest: Day | undefined): Promise<Uint8Array<ArrayBuffer>> {
  if (latest) return renderDayOg(latest);
  return render(
    el(
      {
        width: W,
        height: H,
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.bg,
        color: C.ink,
        fontFamily: "Fraunces",
        padding: "56px 64px 36px",
      },
      [
        el({ flexDirection: "column" }, [
          el({ fontSize: 84, fontWeight: 500, lineHeight: 1.05 }, SITE.name),
          el({ fontSize: 34, color: C.muted, marginTop: 24 }, SITE.tagline),
        ]),
        footer("Updated daily"),
      ],
    ),
  );
}

export function renderTitleOg(title: string, subtitle: string): Promise<Uint8Array<ArrayBuffer>> {
  return render(
    el(
      {
        width: W,
        height: H,
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.bg,
        color: C.ink,
        fontFamily: "Fraunces",
        padding: "56px 64px 36px",
      },
      [
        el({ flexDirection: "column" }, [
          el({ fontSize: 26, letterSpacing: 3, color: C.muted }, SITE.name.toUpperCase()),
          el(
            {
              fontSize: title.length > 40 ? 60 : 76,
              fontWeight: 500,
              lineHeight: 1.05,
              marginTop: 18,
            },
            title,
          ),
          el({ fontSize: 30, color: C.muted, marginTop: 24 }, subtitle),
        ]),
        footer(SITE.tagline),
      ],
    ),
  );
}
