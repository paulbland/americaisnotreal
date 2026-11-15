# americaisnotreal — [americaisnotreal.com](https://americaisnotreal.com)

One pair of true stories from the United States every day, side by side: **Genius** (a
verifiable achievement) and **Facepalm** (a verifiable act of human absurdity that was its own
consequence: the "man marries a pig" story, not a ballot misprint). Tagline: "Same country. Same day." Tone is dry; the site never editorialises.
Every story cites two news organisations, at least one on the accepted list. One fabricated or wrongly described story sinks the
site, so accuracy beats everything.

Astro 7, static, one small inline script (share buttons). Vercel hosting. Node 24+: the
scripts run as TypeScript via native type stripping.

## Commands

```bash
npm run dev        # localhost:4321
npm run validate   # every data file against schema + sourcing + editorial rules
npm run check      # astro check (types, including scripts/)
npm test           # vitest
npm run build      # static build incl. share images
npm run scan -- --dry-run            # the daily scan, writing nothing (needs ANTHROPIC_API_KEY)
npm run scan -- --date=2026-10-01    # the scan for a past day (used by backfill)
npm run backfill -- --from=2026-09-25 --to=2026-10-08   # several past days, 2 at a time
gh workflow run scan.yml --ref <branch> -f date=YYYY-MM-DD -f dry_run=true   # try a branch's scan; writes and publishes nothing
```

## Where the rules live — keep these in sync

The methodology is enforced in code, not just described:

- `src/data/schema.ts`: record shape and cross-field rules (two publishers; quote from a
  cited source; three-sentence summaries; sides can't be swapped).
- `scripts/lib/verify.ts`: the publisher allowlist, banned hosts, official hosts, quote
  matching, the no-victims lint and the loaded-wording lint.
- `scripts/lib/integrity.ts`: repo-wide checks (run by validate, tests and the scan).
- `src/lib/score.ts`: what the story score does: the weekly limit on routine administrative
  errors and the no-repeat rule for facepalm categories. Applied by the scan only, never by
  validate, because the first month of days breaks both.
- `src/lib/weeks.ts`: how the pair of the week is chosen.
- `scripts/lib/prompts.ts`: the rules as the scan's models see them.
- `src/pages/methodology.astro`: the rules as readers see them.

Change one and you almost certainly need to change the others.

## Data

- `src/data/days/{date}.json`: one file per published day. Dates are permanent URLs (`/2026-10-09`).
- `src/data/scans/{date}.json`: one log per scan run, published or not; the newest sets "last checked".
- `src/data/bench.json`: stories that passed every check but had no partner that day. The next
  scan may pair one with a fresh story on the other side while its event is still inside the
  seven-day window; older entries are pruned on every write. Never rendered on its own.
- Files must be canonical `JSON.stringify(x, null, 2) + "\n"` (validate enforces it; Prettier ignores `src/data/`).
- Story slugs are unique across all days; a source URL may be cited on only one day.
- `score` (1 to 10) on a story is the verifier's rating of how strongly it shows its side. It
  is never rendered. Days published before 2026-11-14 have none; `effectiveScore` stands in.
- `local: true` on a source marks the one local newsroom a story may cite from outside the
  accepted list. It is only valid alongside an accepted news publisher.
- Counts are computed at build time. Never hard-code a number anywhere.
- To correct a day: edit the JSON by hand, append to `history` with today's date and what changed, open a PR. To pull a day: delete the file. The scan can never do either.

## The daily scan (`scripts/scan.ts`, `.github/workflows/scan.yml`)

10:00 UTC (6am Eastern in summer). Claude Sonnet 5.5 with web search, at medium effort, runs once per side, in
parallel, each with its own search budget, and proposes up to four ranked candidates, each with a score. Facepalm candidates are tried highest score first. Each candidate, in order, must pass: the schema and repo rules; the
party-balance rule; the variety rules (at most one routine administrative error, score 1 to 3, in any
seven days, and no facepalm category two days running); an independent adversarial review by Claude Opus 5.5 (which may supply corrected headline or summary
wording, re-checked by the same lints; gives the score that is published; and must vouch by
hostname for any local newsroom the story cites); and a mechanical check that
its quote and a corroborating quote appear verbatim on two different publishers' live
pages. The first survivor on each side is published as the pair. A side with no fresh survivor
may take the newest usable story from the bench; if a side still has none, nothing is
published, any verified story on the other side goes to the bench, and the log says why. Sources are saved to the Wayback Machine at
publish time. The workflow re-runs validate/check/test/build, opens a PR and merges it
itself. After the merge, `scripts/indexnow.ts` waits for the deploy and pings IndexNow.

Budget: 60 facepalm and 30 genius discovery searches (facepalm is the harder side to source;
each discovery task tells the model its number, so it can plan them)
plus up to 3 verifications per side at 8 searches each. Discovery runs on Sonnet 5.5 and the
verifier on Opus 5.5; the repository variables `SCAN_DISCOVERY_MODEL` and `SCAN_VERIFIER_MODEL`
change either without a code change (unset means the default; defaults and list prices are in
`scripts/lib/models.ts`). With both jobs on Opus 5.5 a run cost roughly $2 to $4: up to about
$0.90 in search fees ($0.01 a search) and the rest tokens. Sonnet 5.5's token prices are half of
Opus 5.5's, so discovery's share of the tokens should cost about half; no run on the split had
been measured when this was written. The footer of each scan PR is the only cost record: models,
searches, fetches and total on its first line, then each model's token split. The first real
run on 2026-10-09 cost $1.71 and took six minutes.

Every request caches the conversation so far as well as the system prompt (top-level
`cache_control` in `runAgent`). In a healthy footer a model's cache read is several times its
input; cache write with no cache read means the cache is being written and never hit, which
costs more than not caching.

## Editorial rules (non-negotiable)

- Both stories happened in the United States. Americans abroad don't count.
- Facepalm, in order of preference: a person's own voluntary, baffling act; an official or
  institutional decision that is absurd on its face; and only as a last resort a routine
  administrative error (misprint, typo, wrong mailing, payroll mistake), capped at one a week.
  The first month ran a ballot error nearly every day because they pass every check; that is
  the failure the score and the cap exist to prevent. Don't loosen either without Paul. Nobody killed, injured or hospitalised; no minors; no crime victims; no
  mental-health, addiction or disability; no jokes about poverty, immigration, religion or
  groups. Private individuals only if adults, their own act, already named by both cited
  sources; otherwise "unnamed" with a city.
- Sources: two accepted publishers; or one accepted news publisher plus an official page; or
  one accepted news publisher plus one local newsroom the verifier vouches for. Never two
  local newsrooms, never a local newsroom plus an official page.
- Politicians: concrete acts in office only, never views. Democratic and Republican facepalm
  counts stay within one of each other (`partyBalance` in `src/lib/stats.ts`; the scan
  defers a candidate that would widen the gap).
- Our copy is dry and neutral. No adjectives doing argumentative work; the lint in
  `verify.ts` rejects the obvious ones.
- No article images, ever. We summarise and link; the articles belong to their publishers.

## SEO and answer engines

- Day pages are `/{date}`; lists at `/archive`, `/genius`, `/facepalm`, `/states/{state}`,
  `/categories/{category}`. `/weeks` and `/weeks/{iso-week}` (e.g. `/weeks/2026-w46`) show the
  pair of the week: the day with the highest combined score in each Monday-to-Sunday week,
  computed at build time, so a week's pick can change until the week ends. Titles, descriptions, JSON-LD (`src/lib/seo.ts`), OG images
  (`src/lib/og.ts`), `llms.txt`, `days.json` and the RSS feed are all computed from the data.
- Sitemap `lastmod`: a day page's own date; the last scan date for everything else.
- Every icon is drawn at build time from `src/lib/mark.ts`. There are no icon files in `public/`.
- `public/robots.txt` explicitly welcomes AI crawlers. Keep Cloudflare DNS-only (grey cloud)
  once the domain is attached: proxying would put Cloudflare's AI-bot blocking in front of the site.
- `/log` is `noindex`: it's an audit trail, not a landing page.

## Analytics

Plausible (script in `Base.astro`; `Share` custom event, outbound links) and Vercel Speed
Insights (must also be enabled on the Vercel project). No cookies.

## Conventions

npm only. Prettier. One short-lived branch per change (`feat/`, `fix/`, `data/`, `chore/`)
→ PR → squash-merge. Merging to `main` deploys to production (Vercel). The scan's own PRs
self-merge; everything else Paul reviews.
