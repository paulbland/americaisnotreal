import {
  SIDES,
  type Category,
  type Day,
  type Side,
  type StateCode,
  type Story,
} from "../data/schema.ts";

export interface PlacedStory {
  story: Story;
  date: string;
}

/** Every story on every day, newest first, with the day it ran. */
export function allStories(days: Day[]): PlacedStory[] {
  return days.flatMap((d) => SIDES.map((side) => ({ story: d[side], date: d.date })));
}

export interface SideCounts {
  genius: number;
  facepalm: number;
  total: number;
}

function count(stories: PlacedStory[]): SideCounts {
  const genius = stories.filter((s) => s.story.side === "genius").length;
  const facepalm = stories.length - genius;
  return { genius, facepalm, total: stories.length };
}

export interface StateRow extends SideCounts {
  state: StateCode;
}

/** States ranked by total stories, then facepalms, then name. */
export function byState(days: Day[]): StateRow[] {
  const groups = new Map<StateCode, PlacedStory[]>();
  for (const s of allStories(days)) {
    groups.set(s.story.state, [...(groups.get(s.story.state) ?? []), s]);
  }
  return [...groups.entries()]
    .map(([state, stories]) => ({ state, ...count(stories) }))
    .sort((a, b) => b.total - a.total || b.facepalm - a.facepalm || a.state.localeCompare(b.state));
}

export interface CategoryRow extends SideCounts {
  category: Category;
}

export function byCategory(days: Day[]): CategoryRow[] {
  const groups = new Map<Category, PlacedStory[]>();
  for (const s of allStories(days)) {
    groups.set(s.story.category, [...(groups.get(s.story.category) ?? []), s]);
  }
  return [...groups.entries()]
    .map(([category, stories]) => ({ category, ...count(stories) }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

export function storiesIn(days: Day[], where: (s: Story) => boolean): PlacedStory[] {
  return allStories(days).filter((s) => where(s.story));
}

export function onSide(days: Day[], side: Side): PlacedStory[] {
  return storiesIn(days, (s) => s.side === side);
}

/** Facepalm stories about politicians, by party: the balance the scan must keep. */
export function partyBalance(days: Day[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const { story } of onSide(days, "facepalm")) {
    if (story.party) tally[story.party] = (tally[story.party] ?? 0) + 1;
  }
  return tally;
}
