/**
 * What the story score is used for: limiting routine administrative errors on the
 * facepalm side, keeping categories from repeating day after day, and choosing the
 * pair of the week. Pure functions over the data, shared by the scan and the site.
 */
import { ROUTINE_MAX_SCORE, type Category, type Day, type Story } from "../data/schema.ts";

/** Days published before stories were scored get a neutral score. */
const UNSCORED = 5;

/**
 * A story's score, or a stand-in for the days published before scoring began. Every
 * unscored facepalm story filed under government was an election or payroll error, so
 * those count as routine.
 */
export function effectiveScore(s: Pick<Story, "side" | "category" | "score">): number {
  if (s.score !== undefined) return s.score;
  return s.side === "facepalm" && s.category === "government" ? ROUTINE_MAX_SCORE : UNSCORED;
}

/** A facepalm story that is a routine administrative error: a misprint, a typo, a late mailing. */
export function isRoutine(s: Pick<Story, "side" | "category" | "score">): boolean {
  return s.side === "facepalm" && effectiveScore(s) <= ROUTINE_MAX_SCORE;
}

export function pairScore(d: Day): number {
  return effectiveScore(d.genius) + effectiveScore(d.facepalm);
}

function daysApart(a: string, b: string): number {
  return Math.round(Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export interface FacepalmLimits {
  /** False when a routine administrative error already ran within a week of the date. */
  routineAllowed: boolean;
  /** The facepalm categories of the days immediately before and after the date. */
  blockedCategories: Category[];
}

/** What the facepalm side may not be on `date`, given the days already published around it. */
export function facepalmLimits(date: string, days: Day[]): FacepalmLimits {
  const others = days.filter((d) => d.date !== date);
  return {
    routineAllowed: !others.some((d) => daysApart(d.date, date) < 7 && isRoutine(d.facepalm)),
    blockedCategories: [
      ...new Set(
        others.filter((d) => daysApart(d.date, date) === 1).map((d) => d.facepalm.category),
      ),
    ],
  };
}

/** Why this facepalm story can't run on `date`, or null if it can. */
export function varietyProblem(
  story: Pick<Story, "side" | "category" | "score">,
  date: string,
  days: Day[],
): string | null {
  if (story.side !== "facepalm") return null;
  const limits = facepalmLimits(date, days);
  if (isRoutine(story) && !limits.routineAllowed) {
    return "a routine administrative error already ran within a week of this date";
  }
  if (limits.blockedCategories.includes(story.category)) {
    return `the day next to this one already has a ${story.category} facepalm story`;
  }
  return null;
}
