/** A valid day used by the tests. Sources are placeholders on accepted hosts; nothing here is published. */
import type { Day } from "../../src/data/schema.ts";

export const fixtureDay: Day = {
  date: "2026-01-15",
  genius: {
    slug: "test-lab-publishes-result",
    side: "genius",
    headline: "University lab reports a method for repairing a gene in living patients",
    summary:
      "Researchers at a university hospital said they had corrected a single-letter mutation in three adult patients using a one-time infusion. The results were published in a peer-reviewed journal on Tuesday. The team said the patients showed no serious side effects after six months.",
    quote: {
      text: "the first time the technique has been used to correct a mutation directly inside the body",
      sourceUrl: "https://apnews.com/article/test-gene-edit",
    },
    state: "MA",
    city: "Boston",
    category: "medicine",
    subject: "official-or-institution",
    party: null,
    eventDate: "2026-01-14",
    sources: [
      {
        url: "https://apnews.com/article/test-gene-edit",
        publisher: "Associated Press",
        title: "Scientists correct gene inside patients",
        date: "2026-01-14",
      },
      {
        url: "https://www.nytimes.com/2026/01/14/health/test-gene-edit.html",
        publisher: "The New York Times",
        title: "A Gene Edit, Delivered by Infusion",
        date: "2026-01-14",
      },
    ],
  },
  facepalm: {
    slug: "test-council-bans-nonexistent-thing",
    side: "facepalm",
    headline: "City council votes to ban a festival that the city does not hold",
    summary:
      "A city council voted 5 to 2 on Monday to prohibit an annual street festival. City staff later told the council that no such festival has ever taken place in the city. The mayor said the ordinance would remain on the books.",
    quote: {
      text: "no such event has ever been held within city limits, according to the city clerk",
      sourceUrl: "https://www.tampabay.com/news/test-festival-ban",
    },
    state: "FL",
    city: "Testville",
    category: "government",
    subject: "official-or-institution",
    party: null,
    eventDate: "2026-01-13",
    sources: [
      {
        url: "https://www.tampabay.com/news/test-festival-ban",
        publisher: "Tampa Bay Times",
        title: "Council bans festival that doesn't exist",
        date: "2026-01-13",
      },
      {
        url: "https://www.wfla.com/news/test-festival-ban",
        publisher: "WFLA",
        title: "City bans event nobody has heard of",
        date: "2026-01-13",
      },
    ],
  },
  publishedAt: "2026-01-15T10:30:00.000Z",
  model: "test",
  history: [{ date: "2026-01-15", change: "Published by the daily scan." }],
};
