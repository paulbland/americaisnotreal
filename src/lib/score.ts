/**
 * What the story score is used for: limiting routine administrative errors on the
 * facepalm side, keeping categories from repeating day after day, and choosing the
 * pair of the week. Pure functions over the data, shared by the scan and the site.
 */
import {
  FACEPALM_MIN_SCORE,
  ROUTINE_MAX_SCORE,
  type Category,
  type Day,
  type Side,
  type Story,
} from "../data/schema.ts";

/**
 * How many days, up to and including the scan date, a story's event may be old. Odd news is
 * picked up late, often a week or more after a local station breaks it, so facepalm gets longer.
 */
export const FRESH_DAYS: Record<Side, number> = { genius: 7, facepalm: 14 };

/** The earliest event date a story on `side` may have to run on `date`. */
export function freshSince(side: Side, date: string): string {
  return new Date(Date.parse(date) - FRESH_DAYS[side] * 86_400_000).toISOString().slice(0, 10);
}

/** Why this story's event is outside the window for `date`, or null if it is inside it. */
export function freshnessProblem(
  story: Pick<Story, "side" | "eventDate">,
  date: string,
): string | null {
  if (story.eventDate > date) return "the event is after the scan date";
  if (story.eventDate < freshSince(story.side, date)) {
    return `the event is more than ${FRESH_DAYS[story.side]} days before the scan date`;
  }
  return null;
}

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
  const score = effectiveScore(story);
  if (score < FACEPALM_MIN_SCORE) {
    return `scored ${score}; a facepalm story needs at least ${FACEPALM_MIN_SCORE}`;
  }
  const limits = facepalmLimits(date, days);
  if (isRoutine(story) && !limits.routineAllowed) {
    return "a routine administrative error already ran within a week of this date";
  }
  if (limits.blockedCategories.includes(story.category)) {
    return `the day next to this one already has a ${story.category} facepalm story`;
  }
  return null;
}
