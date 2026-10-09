import { describe, expect, it } from "vitest";
import { DaySchema, StorySchema } from "../src/data/schema.ts";
import { fixtureDay } from "./fixtures/day.ts";

describe("schema", () => {
  it("accepts the fixture day", () => {
    expect(DaySchema.safeParse(fixtureDay).success).toBe(true);
  });

  it("rejects a story whose two sources share a publisher", () => {
    const s = {
      ...fixtureDay.genius,
      sources: fixtureDay.genius.sources.map((x) => ({ ...x, publisher: "AP" })),
    };
    expect(StorySchema.safeParse(s).success).toBe(false);
  });

  it("rejects a quote that isn't from one of the sources", () => {
    const s = {
      ...fixtureDay.genius,
      quote: { ...fixtureDay.genius.quote, sourceUrl: "https://reuters.com/x" },
    };
    expect(StorySchema.safeParse(s).success).toBe(false);
  });

  it("rejects a summary longer than three sentences", () => {
    const s = {
      ...fixtureDay.genius,
      summary: "One is here. Two is here. Three is here. Four is here. Five is here now.",
    };
    expect(StorySchema.safeParse(s).success).toBe(false);
  });

  it("rejects a day whose sides are swapped", () => {
    const d = { ...fixtureDay, genius: fixtureDay.facepalm, facepalm: fixtureDay.genius };
    expect(DaySchema.safeParse(d).success).toBe(false);
  });

  it("rejects an event after the day's date", () => {
    const d = { ...fixtureDay, genius: { ...fixtureDay.genius, eventDate: "2026-01-16" } };
    expect(DaySchema.safeParse(d).success).toBe(false);
  });

  it("rejects an unknown field", () => {
    const d = { ...fixtureDay, extra: 1 };
    expect(DaySchema.safeParse(d).success).toBe(false);
  });
});

describe("bench", () => {
  it("accepts a verified story with the date it was verified", async () => {
    const { BenchSchema } = await import("../src/data/schema.ts");
    expect(
      BenchSchema.safeParse([{ story: fixtureDay.genius, verifiedOn: "2026-01-15" }]).success,
    ).toBe(true);
    expect(BenchSchema.safeParse([{ story: fixtureDay.genius }]).success).toBe(false);
  });
});
