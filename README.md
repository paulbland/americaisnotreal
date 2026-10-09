# America Is Not Real

**Same country. Same day.**

Every day, two true stories from the United States, side by side: one that shows what people
here are capable of (**Genius**), and one that shows what they are also capable of
(**Facepalm**). Both are reported by at least two accepted news publishers, summarised in
neutral language, and linked to their sources. There is no commentary.

The pair is found, fact-checked and published automatically. See the
[methodology](https://americaisnotreal.com/methodology) for the rules and the
[scan log](https://americaisnotreal.com/log) for every candidate considered.

## Stack

Astro 7 (static) on Vercel. A GitHub Actions cron runs `scripts/scan.ts` daily: Claude Opus 5.5
with web search proposes candidates; each must pass schema and sourcing rules, an adversarial
second review, and verbatim quote checks against two publishers' live pages before it is
published. Every day is one JSON file in `src/data/days/`.

## Develop

```bash
npm install
npm run dev
npm run validate && npm run check && npm test && npm run build
```

See [CLAUDE.md](CLAUDE.md) for where every rule lives.

## License

Headlines and summaries: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Code: MIT.
The linked articles belong to their publishers.
