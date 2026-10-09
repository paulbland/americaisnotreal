import { describe, expect, it } from "vitest";
import {
  ACCEPTED_PUBLISHERS,
  BANNED_HOSTS,
  containsQuote,
  editorialisingTerms,
  facepalmBlockedTerms,
  htmlToText,
  isAcceptedPublisher,
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
  });
});
