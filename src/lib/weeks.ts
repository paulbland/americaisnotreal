/**
 * The pair of the week: for each Monday-to-Sunday week with at least one published
 * day, the day whose two stories score highest. Computed at build time.
 */
import type { Day } from "../data/schema.ts";
import { formatDate } from "./format.ts";
import { effectiveScore, pairScore } from "./score.ts";

export interface Week {
  /** ISO week id in lower case, e.g. "2026-w46". The permanent URL segment. */
  id: string;
  /** The Monday the week starts on, YYYY-MM-DD. */
  start: string;
  /** The Sunday it ends on. */
  end: string;
  /** The week's published days, newest first. */
  days: Day[];
  /** The day whose pair scored highest. */
  pick: Day;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}

/** ISO 8601 week id: the week belongs to the year its Thursday falls in. */
export function weekId(date: string): string {
  const thursday = new Date(`${weekStart(date)}T00:00:00Z`);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-w${String(week).padStart(2, "0")}`;
}

/** Highest pair score; ties go to the stronger facepalm story, then to the later day. */
export function pickOf(days: Day[]): Day {
  return [...days].sort(
    (a, b) =>
      pairScore(b) - pairScore(a) ||
      effectiveScore(b.facepalm) - effectiveScore(a.facepalm) ||
      b.date.localeCompare(a.date),
  )[0]!;
}

/** Every week with a published day, newest first. */
export function weeksOf(days: Day[]): Week[] {
  const groups = new Map<string, Day[]>();
  for (const d of days) {
    const start = weekStart(d.date);
    groups.set(start, [...(groups.get(start) ?? []), d]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([start, list]) => {
      const end = new Date(`${start}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 6);
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
      return { id: weekId(start), start, end: iso(end), days: sorted, pick: pickOf(sorted) };
    });
}

export function weekOf(date: string, days: Day[]): Week | undefined {
  const start = weekStart(date);
  return weeksOf(days).find((w) => w.start === start);
}

export function weekPath(w: Week | string): string {
  return `/weeks/${typeof w === "string" ? w : w.id}`;
}

/** "Week of November 9, 2026". */
export function weekName(w: Week): string {
  return `Week of ${formatDate(w.start)}`;
}

/** True while the week can still gain days, judged against the last scan date. */
export function inProgress(w: Week, asOf: string): boolean {
  return asOf < w.end;
}
