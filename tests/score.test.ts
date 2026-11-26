import { describe, expect, it } from "vitest";
import type { Day, Story } from "../src/data/schema.ts";
import {
  effectiveScore,
  facepalmLimits,
  freshnessProblem,
  isRoutine,
  pairScore,
  varietyProblem,
} from "../src/lib/score.ts";
import { inProgress, pickOf, weekId, weekPath, weekStart, weeksOf } from "../src/lib/weeks.ts";
import { fixtureDay } from "./fixtures/day.ts";

/** A copy of the fixture day on another date, with the facepalm story changed. */
function day(date: string, facepalm: Partial<Story> = {}, genius: Partial<Story> = {}): Day {
  return {
    ...fixtureDay,
    date,
    genius: { ...fixtureDay.genius, slug: `g-${date}`, ...genius },
    facepalm: { ...fixtureDay.facepalm, slug: `f-${date}`, ...facepalm },
  };
}

describe("scores", () => {
  it("uses the story's score when it has one", () => {
    expect(effectiveScore({ ...fixtureDay.facepalm, score: 8 })).toBe(8);
    expect(isRoutine({ ...fixtureDay.facepalm, score: 3 })).toBe(true);
    expect(isRoutine({ ...fixtureDay.facepalm, score: 4 })).toBe(false);
  });

  it("treats an unscored government facepalm as routine and everything else as neutral", () => {
    expect(fixtureDay.facepalm.category).toBe("government");
    expect(effectiveScore(fixtureDay.facepalm)).toBe(3);
    expect(effectiveScore({ ...fixtureDay.facepalm, category: "animals" })).toBe(5);
    expect(effectiveScore(fixtureDay.genius)).toBe(5);
    expect(isRoutine(fixtureDay.genius)).toBe(false);
  });

  it("adds the two sides for the pair", () => {
    expect(pairScore(day("2026-11-10", { score: 9 }, { score: 6 }))).toBe(15);
  });
});

describe("variety rules", () => {
  const routine = { side: "facepalm", category: "government", score: 2 } as const;
  const absurd = { side: "facepalm", category: "animals", score: 8 } as const;

  it("never runs a facepalm story scored below 5", () => {
    expect(varietyProblem(routine, "2026-11-16", [])).toMatch(/needs at least 5/);
    expect(varietyProblem({ ...absurd, score: 4 }, "2026-11-16", [])).toMatch(/scored 4/);
    expect(varietyProblem({ ...absurd, score: 5 }, "2026-11-16", [])).toBeNull();
    // An unscored government facepalm counts as routine.
    expect(varietyProblem({ side: "facepalm", category: "government" }, "2026-11-16", [])).toMatch(
      /scored 3/,
    );
  });

  it("still records a routine error within seven days, before and after the date", () => {
    const days = [day("2026-11-10", { score: 2 })];
    expect(facepalmLimits("2026-11-12", days).routineAllowed).toBe(false);
    expect(facepalmLimits("2026-11-06", days).routineAllowed).toBe(false);
    expect(facepalmLimits("2026-11-17", days).routineAllowed).toBe(true);
    expect(varietyProblem(absurd, "2026-11-12", days)).toBeNull();
  });

  it("never runs the same facepalm category two days running", () => {
    const days = [day("2026-11-10", { category: "animals", score: 7 })];
    expect(facepalmLimits("2026-11-11", days).blockedCategories).toEqual(["animals"]);
    expect(varietyProblem(absurd, "2026-11-11", days)).toMatch(/animals/);
    expect(varietyProblem(absurd, "2026-11-09", days)).toMatch(/animals/);
    expect(varietyProblem(absurd, "2026-11-12", days)).toBeNull();
    expect(varietyProblem({ ...absurd, category: "food" }, "2026-11-11", days)).toBeNull();
  });

  it("ignores the day itself and never limits the genius side", () => {
    const days = [day("2026-11-10", { score: 2 })];
    expect(facepalmLimits("2026-11-10", days).routineAllowed).toBe(true);
    expect(
      varietyProblem({ side: "genius", category: "government", score: 2 }, "2026-11-11", days),
    ).toBeNull();
  });
});

describe("freshness", () => {
  it("gives genius 7 days and facepalm 14", () => {
    const g = (eventDate: string) => ({ side: "genius", eventDate }) as const;
    const f = (eventDate: string) => ({ side: "facepalm", eventDate }) as const;
    expect(freshnessProblem(g("2026-11-18"), "2026-11-25")).toBeNull();
    expect(freshnessProblem(g("2026-11-17"), "2026-11-25")).toMatch(/7 days/);
    expect(freshnessProblem(f("2026-11-11"), "2026-11-25")).toBeNull();
    expect(freshnessProblem(f("2026-11-10"), "2026-11-25")).toMatch(/14 days/);
    expect(freshnessProblem(f("2026-11-26"), "2026-11-25")).toMatch(/after the scan date/);
  });
});

describe("weeks", () => {
  it("starts weeks on Monday and names them by ISO week", () => {
    expect(weekStart("2026-11-14")).toBe("2026-11-09"); // a Saturday
    expect(weekStart("2026-11-09")).toBe("2026-11-09"); // a Monday
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // a Sunday
    expect(weekId("2026-11-14")).toBe("2026-w46");
    expect(weekId("2026-01-01")).toBe("2026-w01");
    expect(weekId("2027-01-01")).toBe("2026-w53"); // a Friday in the last week of 2026
    expect(weekId("2024-12-30")).toBe("2025-w01"); // a Monday in the first week of 2025
    expect(weekPath("2026-w46")).toBe("/weeks/2026-w46");
  });

  it("groups days into weeks, newest first", () => {
    const weeks = weeksOf([day("2026-11-14"), day("2026-11-10"), day("2026-11-08")]);
    expect(weeks.map((w) => [w.id, w.start, w.end, w.days.map((d) => d.date)])).toEqual([
      ["2026-w46", "2026-11-09", "2026-11-15", ["2026-11-14", "2026-11-10"]],
      ["2026-w45", "2026-11-02", "2026-11-08", ["2026-11-08"]],
    ]);
  });

  it("picks the highest pair score, then the stronger facepalm, then the later day", () => {
    const a = day("2026-11-10", { score: 4 }, { score: 9 });
    const b = day("2026-11-11", { score: 8 }, { score: 5 });
    const c = day("2026-11-12", { score: 7 }, { score: 5 });
    expect(pickOf([a, b, c]).date).toBe("2026-11-11");
    const d = day("2026-11-13", { score: 8 }, { score: 5 });
    expect(pickOf([a, b, d]).date).toBe("2026-11-13");
  });

  it("knows whether a week can still change", () => {
    const [week] = weeksOf([day("2026-11-10")]);
    expect(inProgress(week!, "2026-11-14")).toBe(true);
    expect(inProgress(week!, "2026-11-15")).toBe(false);
  });
});
