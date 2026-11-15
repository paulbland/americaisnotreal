import { describe, expect, it } from "vitest";
import {
  ACCEPTED_PUBLISHERS,
  BANNED_HOSTS,
  containsQuote,
  editorialisingTerms,
  facepalmBlockedTerms,
  htmlToText,
  isAcceptedPublisher,
  localSourceAllowed,
  sourceAllowed,
} from "../scripts/lib/verify.ts";

describe("publisher allowlist", () => {
  it("has no duplicates", () => {
    expect(new Set(ACCEPTED_PUBLISHERS).size).toBe(ACCEPTED_PUBLISHERS.length);
  });

  it("never overlaps the banned list", () => {
    for (const b of BANNED_HOSTS) expect(isAcceptedPublisher(b)).toBe(false);
  });

  it("matches subdomains", () => {
    expect(sourceAllowed("https://www.apnews.com/article/x")).toBe(true);
    expect(sourceAllowed("https://abcnews.go.com/US/x")).toBe(true);
    expect(sourceAllowed("https://news.wfla.com/x")).toBe(true);
  });

  it("accepts official hosts and universities", () => {
    expect(sourceAllowed("https://www.nobelprize.org/prizes/x")).toBe(true);
    expect(sourceAllowed("https://news.mit.edu/x")).toBe(true);
    expect(sourceAllowed("https://www.nasa.gov/x")).toBe(true);
  });

  it("rejects tabloids, satire, aggregators and social media", () => {
    for (const url of [
      "https://nypost.com/x",
      "https://www.theonion.com/x",
      "https://news.yahoo.com/x",
      "https://x.com/x",
      "https://en.wikipedia.org/x",
      "https://www.prnewswire.com/x",
      "https://randomblog.example/x",
    ]) {
      expect(sourceAllowed(url), url).toBe(false);
    }
  });
});

describe("local newsrooms", () => {
  it("accepts an ordinary https host that is on no list", () => {
    expect(localSourceAllowed("https://www.smalltowngazette.com/news/pig-wedding")).toBe(true);
  });
  it("rejects banned hosts, platforms, archives, IP addresses and plain http", () => {
    for (const url of [
      "https://nypost.com/x",
      "https://someone.substack.com/p/x",
      "https://www.newsbreak.com/x",
      "https://news.google.com/x",
      "https://web.archive.org/web/2026/https://example.com",
      "https://192.168.1.1/x",
      "http://www.smalltowngazette.com/x",
    ]) {
      expect(localSourceAllowed(url), url).toBe(false);
    }
  });
  it("is not for hosts the accepted or official lists already cover", () => {
    expect(localSourceAllowed("https://apnews.com/article/x")).toBe(false);
    expect(localSourceAllowed("https://www.upi.com/Odd_News/x")).toBe(false);
    expect(localSourceAllowed("https://news.mit.edu/x")).toBe(false);
  });
  it("accepts UPI as a publisher", () => {
    expect(sourceAllowed("https://www.upi.com/Odd_News/2026/11/12/x/123/")).toBe(true);
  });
});

describe("containsQuote", () => {
  const page = htmlToText(
    "<p>The council voted 5&ndash;2 on Monday to prohibit the “Harvest Lights” festival, which the city clerk said has never been held.</p>",
  );
  it("finds a verbatim quote through entities, curly quotes and dashes", () => {
    expect(
      containsQuote(page, 'prohibit the "Harvest Lights" festival, which the city clerk'),
    ).toBe(true);
    expect(containsQuote(page, "voted 5-2 on Monday to prohibit")).toBe(true);
  });
  it("rejects a paraphrase and a short quote", () => {
    expect(containsQuote(page, "the council banned the Harvest Lights festival on Monday")).toBe(
      false,
    );
    expect(containsQuote(page, "voted 5-2")).toBe(false);
  });
});

describe("editorial lints", () => {
  it("flags loaded words in our own copy", () => {
    expect(editorialisingTerms("A brilliant and hilarious result")).toEqual([
      "brilliant",
      "hilarious",
    ]);
    expect(editorialisingTerms("Researchers report a new result")).toEqual([]);
  });
  it("flags anyone hurt or any minor on the facepalm side", () => {
    expect(facepalmBlockedTerms("A 14-year-old was injured when")).toContain("injured");
    expect(facepalmBlockedTerms("A 14-year-old was injured when")).toContain("14-year-old");
    expect(facepalmBlockedTerms("A man married an oak tree in a ceremony")).toEqual([]);
    expect(facepalmBlockedTerms("A 17-year-old tried to")).toContain("17-year-old");
    expect(facepalmBlockedTerms("A 9-year-old tried to")).toContain("9-year-old");
  });
  it("lets an adult's age through", () => {
    expect(facepalmBlockedTerms("A 42-year-old man married a pig in a ceremony")).toEqual([]);
    expect(facepalmBlockedTerms("An 18-year-old sued the sun")).toEqual([]);
    expect(facepalmBlockedTerms("A 117-year-old record")).toEqual([]);
  });
});
