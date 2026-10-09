/**
 * Repo-wide checks over every data file: schema, canonical serialisation,
 * accepted hosts, slug uniqueness and the editorial lints. Run by validate,
 * the tests and the scan (before and after it writes anything).
 */
import { z } from "zod";
import {
  DaySchema,
  ScanLogSchema,
  SIDES,
  type Day,
  type ScanLog,
  type Story,
} from "../../src/data/schema.ts";
import { canonicalJson, DAYS_DIR, readDir, SCANS_DIR } from "./files.ts";
import {
  editorialisingTerms,
  facepalmBlockedTerms,
  hostOf,
  isAcceptedPublisher,
  isPrimaryHost,
  sourceAllowed,
} from "./verify.ts";

/** Problems with one story, independent of every other day. */
export function storyProblems(s: Story): string[] {
  const problems: string[] = [];
  for (const src of s.sources) {
    if (!sourceAllowed(src.url))
      problems.push(`${s.slug}: source not accepted: ${hostOf(src.url)}`);
    if (src.archiveUrl && !src.archiveUrl.includes("web.archive.org")) {
      problems.push(`${s.slug}: archiveUrl isn't a Wayback Machine link`);
    }
  }
  const newsHosts = s.sources.filter((x) => isAcceptedPublisher(hostOf(x.url)));
  if (newsHosts.length < 1) problems.push(`${s.slug}: needs at least one accepted news publisher`);
  const primaryOnly = s.sources.every(
    (x) => isPrimaryHost(hostOf(x.url)) && !isAcceptedPublisher(hostOf(x.url)),
  );
  if (primaryOnly) problems.push(`${s.slug}: can't rest on official announcements alone`);

  const copy = `${s.headline} ${s.summary}`;
  const loaded = editorialisingTerms(copy);
  if (loaded.length) problems.push(`${s.slug}: loaded wording in our copy: ${loaded.join(", ")}`);

  if (s.side === "facepalm") {
    const blocked = facepalmBlockedTerms(copy);
    if (blocked.length) {
      problems.push(
        `${s.slug}: facepalm story mentions ${blocked.join(", ")}; see the no-victims rule`,
      );
    }
    if (s.subject === "unnamed" && s.city === null) {
      problems.push(`${s.slug}: an unnamed facepalm subject needs at least a city`);
    }
  }
  if (s.party !== null && !["public-figure", "official-or-institution"].includes(s.subject)) {
    problems.push(`${s.slug}: party is set but the subject isn't a public figure or official`);
  }
  return problems;
}

export function dayProblems(d: Day): string[] {
  return SIDES.flatMap((side) => storyProblems(d[side]));
}

export interface RepoCheck {
  days: Day[];
  scans: ScanLog[];
  errors: string[];
}

export function checkRepo(): RepoCheck {
  const errors: string[] = [];
  const days: Day[] = [];
  const slugs = new Map<string, string>();

  for (const f of readDir(DAYS_DIR)) {
    const parsed = DaySchema.safeParse(f.json);
    if (!parsed.success) {
      errors.push(`${f.name}.json: ${z.prettifyError(parsed.error)}`);
      continue;
    }
    const d = parsed.data;
    if (d.date !== f.name) errors.push(`${f.name}.json: date "${d.date}" ≠ filename`);
    if (f.text !== canonicalJson(f.json)) errors.push(`${f.name}.json: not canonical JSON`);
    for (const side of SIDES) {
      const slug = d[side].slug;
      const seen = slugs.get(slug);
      if (seen) errors.push(`${f.name}.json: slug "${slug}" already used on ${seen}`);
      slugs.set(slug, d.date);
    }
    errors.push(...dayProblems(d).map((p) => `${f.name}.json: ${p}`));
    days.push(d);
  }

  const scans: ScanLog[] = [];
  for (const f of readDir(SCANS_DIR)) {
    const parsed = ScanLogSchema.safeParse(f.json);
    if (!parsed.success) {
      errors.push(`scans/${f.name}.json: ${z.prettifyError(parsed.error)}`);
      continue;
    }
    if (parsed.data.date !== f.name) errors.push(`scans/${f.name}.json: date ≠ filename`);
    if (f.text !== canonicalJson(f.json)) errors.push(`scans/${f.name}.json: not canonical JSON`);
    scans.push(parsed.data);
  }
  return { days, scans, errors };
}
