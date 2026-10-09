# americaisnotreal — [americaisnotreal.com](https://americaisnotreal.com)

One pair of true stories from the United States every day, side by side: **Genius** (a
verifiable achievement) and **Facepalm** (a verifiable act of foolishness that was its own
consequence). Tagline: "Same country. Same day." Tone is dry; the site never editorialises.
Every story cites two accepted publishers. One fabricated or wrongly described story sinks the
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
```

## Where the rules live — keep these in sync

The methodology is enforced in code, not just described:

- `src/data/schema.ts`: record shape and cross-field rules (two publishers; quote from a
  cited source; three-sentence summaries; sides can't be swapped).
- `scripts/lib/verify.ts`: the publisher allowlist, banned hosts, official hosts, quote
  matching, the no-victims lint and the loaded-wording lint.
- `scripts/lib/integrity.ts`: repo-wide checks (run by validate, tests and the scan).
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
- Counts are computed at build time. Never hard-code a number anywhere.
- To correct a day: edit the JSON by hand, append to `history` with today's date and what changed, open a PR. To pull a day: delete the file. The scan can never do either.

## The daily scan (`scripts/scan.ts`, `.github/workflows/scan.yml`)

10:00 UTC (6am Eastern in summer). Claude Opus 5.5 with web search proposes up to four ranked
candidates per side. Each candidate, in order, must pass: the schema and repo rules; the
party-balance rule; an independent adversarial Claude review; and a mechanical check that
its quote and a corroborating quote appear verbatim on two different publishers' live
pages. The first survivor on each side is published as the pair. A side with no fresh survivor
may take the newest usable story from the bench; if a side still has none, nothing is
published, any verified story on the other side goes to the bench, and the log says why. Sources are saved to the Wayback Machine at
publish time. The workflow re-runs validate/check/test/build, opens a PR and merges it
itself. After the merge, `scripts/indexnow.ts` waits for the deploy and pings IndexNow.

Budget: 60 discovery searches (facepalm first, since it is the harder side to source) plus
up to 3 verifications per side at 8 searches each, roughly $2 to $4 a day. The first real
run on 2026-10-09 cost $1.71 and took six minutes.

## Editorial rules (non-negotiable)

- Both stories happened in the United States. Americans abroad don't count.
- Facepalm: nobody killed, injured or hospitalised; no minors; no crime victims; no
  mental-health, addiction or disability; no jokes about poverty, immigration, religion or
  groups. Private individuals only if adults, their own act, already named by two accepted
  publishers; otherwise "unnamed" with a city.
- Politicians: concrete acts in office only, never views. Democratic and Republican facepalm
  counts stay within one of each other (`partyBalance` in `src/lib/stats.ts`; the scan
  defers a candidate that would widen the gap).
- Our copy is dry and neutral. No adjectives doing argumentative work; the lint in
  `verify.ts` rejects the obvious ones.
- No article images, ever. We summarise and link; the articles belong to their publishers.

## SEO and answer engines

- Day pages are `/{date}`; lists at `/archive`, `/genius`, `/facepalm`, `/states/{state}`,
  `/categories/{category}`. Titles, descriptions, JSON-LD (`src/lib/seo.ts`), OG images
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
