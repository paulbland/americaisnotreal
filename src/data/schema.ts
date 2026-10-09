/**
 * The shape of every record on the site. This file is the enforcement point for
 * the editorial rules: a day that doesn't meet them fails the build, and the
 * daily scan runs every proposed pair through the same schema before it can be
 * merged. Imported by Astro (Vite) and by the Node scripts, so it must only
 * import zod.
 */
import { z } from "zod";

export const SIDES = ["genius", "facepalm"] as const;
export const SideSchema = z.enum(SIDES);
export type Side = z.infer<typeof SideSchema>;

export const CATEGORIES = [
  "science",
  "technology",
  "medicine",
  "space",
  "government",
  "law",
  "crime",
  "business",
  "animals",
  "education",
  "sports",
  "culture",
  "environment",
  "transport",
  "food",
] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

/**
 * Who the story is about. Private individuals may only appear on the facepalm
 * side under the conditions in the methodology (an adult, their own voluntary
 * act, already named by at least two accepted publishers).
 */
export const SUBJECTS = [
  "public-figure",
  "official-or-institution",
  "business",
  "private-individual",
  "group",
  "unnamed",
] as const;
export const SubjectSchema = z.enum(SUBJECTS);
export type Subject = z.infer<typeof SubjectSchema>;

/** Two-letter USPS codes plus DC, PR and "US" for national stories. */
export const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC", "PR", "US",
] as const;
export const StateSchema = z.enum(STATE_CODES);
export type StateCode = z.infer<typeof StateSchema>;

export const PARTIES = ["democratic", "republican", "independent", "other"] as const;
export const PartySchema = z.enum(PARTIES);
export type Party = z.infer<typeof PartySchema>;

function isRealDate(s: string): boolean {
  const [y, m = 1, d = 1] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine(isRealDate, "not a real calendar date");

const HttpsUrl = z.url({ protocol: /^https?$/ });

export const SourceSchema = z
  .object({
    url: HttpsUrl,
    /** Registrable domain's publisher name as readers know it, e.g. "Associated Press". */
    publisher: z.string().min(1),
    title: z.string().min(1),
    date: IsoDateSchema.nullable(),
    /** Wayback Machine snapshot, so the citation survives link rot. */
    archiveUrl: HttpsUrl.optional(),
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;

export const MIN_QUOTE_CHARS = 25;
export const MAX_QUOTE_CHARS = 280;

export const QuoteSchema = z
  .object({
    /** Verbatim from the page at `sourceUrl`; checked mechanically before publishing. */
    text: z.string().min(MIN_QUOTE_CHARS).max(MAX_QUOTE_CHARS),
    /** Must also appear in the story's `sources`. */
    sourceUrl: HttpsUrl,
  })
  .strict();

export const StoryObject = z
  .object({
    /** Permanent id, kebab-case, unique across every day. */
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case"),
    side: SideSchema,
    /** Our own headline: plain, factual, no adjectives doing the work. */
    headline: z.string().min(20).max(110),
    /** Two or three sentences in our words. No opinion, no jokes. */
    summary: z.string().min(120).max(600),
    quote: QuoteSchema,
    state: StateSchema,
    city: z.string().min(1).nullable(),
    category: CategorySchema,
    subject: SubjectSchema,
    /** Set only when the subject is a politician or party official acting as one. */
    party: PartySchema.nullable(),
    /** When the thing happened or was announced. */
    eventDate: IsoDateSchema,
    sources: z.array(SourceSchema).min(2),
  })
  .strict();

export const StorySchema = StoryObject.superRefine((s, ctx) => {
  const publishers = new Set(s.sources.map((x) => x.publisher.trim().toLowerCase()));
  if (publishers.size < 2) {
    ctx.addIssue({ code: "custom", message: "needs sources from two different publishers" });
  }
  if (!s.sources.some((x) => x.url === s.quote.sourceUrl)) {
    ctx.addIssue({ code: "custom", message: "quote.sourceUrl must be one of the sources" });
  }
  if (s.summary.split(/(?<=[.!?])\s+/).length > 4) {
    ctx.addIssue({ code: "custom", message: "summary is longer than three sentences" });
  }
});
export type Story = z.infer<typeof StorySchema>;

export const HistorySchema = z
  .object({
    date: IsoDateSchema,
    change: z.string().min(1),
  })
  .strict();

export const DayObject = z
  .object({
    date: IsoDateSchema,
    genius: StorySchema,
    facepalm: StorySchema,
    /** ISO timestamp of the scan run that published the pair. */
    publishedAt: z.string().datetime(),
    model: z.string().min(1),
    history: z.array(HistorySchema).min(1),
  })
  .strict();

export const DaySchema = DayObject.superRefine((d, ctx) => {
  if (d.genius.side !== "genius") {
    ctx.addIssue({ code: "custom", path: ["genius", "side"], message: 'must be "genius"' });
  }
  if (d.facepalm.side !== "facepalm") {
    ctx.addIssue({ code: "custom", path: ["facepalm", "side"], message: 'must be "facepalm"' });
  }
  if (d.genius.slug === d.facepalm.slug) {
    ctx.addIssue({ code: "custom", message: "the two stories share a slug" });
  }
  for (const side of SIDES) {
    if (d[side].eventDate > d.date) {
      ctx.addIssue({ code: "custom", path: [side, "eventDate"], message: "after the day's date" });
    }
  }
});
export type Day = z.infer<typeof DaySchema>;

export const CandidateOutcomeSchema = z
  .object({
    side: SideSchema,
    headline: z.string().min(1),
    /** benched = passed every check but had no partner that day; kept for a later day. */
    outcome: z.enum(["published", "benched", "rejected", "deferred", "unused"]),
    reason: z.string().min(1),
  })
  .strict();

export const ScanLogSchema = z
  .object({
    date: IsoDateSchema,
    startedAt: z.string().datetime(),
    finishedAt: z.string().datetime(),
    model: z.string().min(1),
    searches: z.number().int().min(0),
    /** One or two sentences for the log page. */
    summary: z.string().min(1),
    /** Whether a pair was published for this date. */
    published: z.boolean(),
    candidates: z.array(CandidateOutcomeSchema),
  })
  .strict();
export type ScanLog = z.infer<typeof ScanLogSchema>;

/**
 * A story that passed every check but had no partner on its day. The next scan
 * may pair it with a fresh story on the other side, as long as its event is
 * still within the seven-day window. Internal: never rendered on its own.
 */
export const BenchEntrySchema = z
  .object({
    story: StorySchema,
    /** The scan date on which it was verified. */
    verifiedOn: IsoDateSchema,
  })
  .strict();
export type BenchEntry = z.infer<typeof BenchEntrySchema>;
export const BenchSchema = z.array(BenchEntrySchema);
