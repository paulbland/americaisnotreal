import { describe, expect, it } from "vitest";
import type { Day } from "../src/data/schema.ts";
import { dayDescription, dayTitle } from "../src/lib/seo.ts";
import { place, statePath, stateSlug } from "../src/lib/states.ts";
import { byState, onSide, partyBalance } from "../src/lib/stats.ts";
import { fixtureDay } from "./fixtures/day.ts";

const second: Day = {
  ...fixtureDay,
  date: "2026-01-16",
  genius: { ...fixtureDay.genius, slug: "g2", state: "FL" },
  facepalm: {
    ...fixtureDay.facepalm,
    slug: "f2",
    state: "TX",
    subject: "public-figure",
    party: "republican",
  },
};
const days = [second, fixtureDay];

describe("stats", () => {
  it("ranks states by total then facepalms", () => {
    expect(byState(days).map((r) => [r.state, r.genius, r.facepalm])).toEqual([
      ["FL", 1, 1],
      ["TX", 0, 1],
      ["MA", 1, 0],
    ]);
  });
  it("lists one side newest first", () => {
    expect(onSide(days, "genius").map((s) => s.story.slug)).toEqual([
      "g2",
      "test-lab-publishes-result",
    ]);
  });
  it("counts political facepalms by party", () => {
    expect(partyBalance(days)).toEqual({ republican: 1 });
  });
});

describe("states and seo", () => {
  it("slugs and names", () => {
    expect(stateSlug("DC")).toBe("washington-dc");
    expect(statePath("NY")).toBe("/states/new-york");
    expect(place("Austin", "TX")).toBe("Austin, Texas");
    expect(place(null, "US")).toBe("Nationwide");
  });
  it("day title and description are computed from the data", () => {
    expect(dayTitle(fixtureDay)).toMatch(/^January 15, 2026: University lab/);
    expect(dayDescription(fixtureDay)).toContain("Boston, Massachusetts");
  });
});
