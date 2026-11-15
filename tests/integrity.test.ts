import { describe, expect, it } from "vitest";
import { checkRepo, dayProblems, storyProblems } from "../scripts/lib/integrity.ts";
import { fixtureDay } from "./fixtures/day.ts";

describe("integrity", () => {
  it("the fixture day has no problems", () => {
    expect(dayProblems(fixtureDay)).toEqual([]);
  });

  it("rejects a source off the allowlist", () => {
    const s = {
      ...fixtureDay.genius,
      sources: [
        fixtureDay.genius.sources[0]!,
        { ...fixtureDay.genius.sources[1]!, url: "https://nypost.com/x" },
      ],
    };
    expect(storyProblems(s).join()).toMatch(/not accepted/);
  });

  const local = {
    url: "https://www.smalltowngazette.com/news/festival-ban",
    publisher: "Smalltown Gazette",
    title: "Council bans festival",
    date: "2026-01-13",
    local: true as const,
  };

  it("accepts one local newsroom alongside an accepted publisher", () => {
    const s = { ...fixtureDay.facepalm, sources: [fixtureDay.facepalm.sources[0]!, local] };
    expect(storyProblems(s)).toEqual([]);
  });

  it("rejects the same host when it isn't marked local", () => {
    const { local: _, ...unmarked } = local;
    const s = { ...fixtureDay.facepalm, sources: [fixtureDay.facepalm.sources[0]!, unmarked] };
    expect(storyProblems(s).join()).toMatch(/not accepted/);
  });

  it("rejects two local newsrooms, and a local newsroom with no accepted publisher", () => {
    const second = {
      ...local,
      url: "https://www.othertownnews.com/x",
      publisher: "Othertown News",
    };
    const two = {
      ...fixtureDay.facepalm,
      sources: [fixtureDay.facepalm.sources[0]!, local, second],
    };
    expect(storyProblems(two).join()).toMatch(/at most one local newsroom/);
    const official = {
      ...fixtureDay.facepalm,
      quote: { ...fixtureDay.facepalm.quote, sourceUrl: local.url },
      sources: [{ ...fixtureDay.facepalm.sources[0]!, url: "https://www.cityofx.gov/a" }, local],
    };
    expect(storyProblems(official).join()).toMatch(/accepted news publisher/);
  });

  it("rejects a banned host passed off as a local newsroom", () => {
    const s = {
      ...fixtureDay.facepalm,
      sources: [fixtureDay.facepalm.sources[0]!, { ...local, url: "https://nypost.com/x" }],
    };
    expect(storyProblems(s).join()).toMatch(/not acceptable as a local newsroom/);
  });

  it("rejects a story resting on official announcements alone", () => {
    const s = {
      ...fixtureDay.genius,
      quote: { ...fixtureDay.genius.quote, sourceUrl: "https://news.mit.edu/a" },
      sources: [
        { ...fixtureDay.genius.sources[0]!, url: "https://news.mit.edu/a", publisher: "MIT News" },
        { ...fixtureDay.genius.sources[1]!, url: "https://www.nasa.gov/b", publisher: "NASA" },
      ],
    };
    expect(storyProblems(s).join()).toMatch(/accepted news publisher/);
  });

  it("rejects loaded wording", () => {
    const s = {
      ...fixtureDay.facepalm,
      headline: "City council does something absurd and bans a festival",
    };
    expect(storyProblems(s).join()).toMatch(/loaded wording/);
  });

  it("rejects a facepalm story that mentions an injury", () => {
    const s = {
      ...fixtureDay.facepalm,
      summary: `${fixtureDay.facepalm.summary} One attendee was injured.`,
    };
    expect(storyProblems(s).join()).toMatch(/no-victims/);
  });

  it("rejects a party on a non-political subject", () => {
    const s = {
      ...fixtureDay.facepalm,
      subject: "business" as const,
      party: "republican" as const,
    };
    expect(storyProblems(s).join()).toMatch(/party is set/);
  });

  it("the repository's data files are valid", () => {
    const { errors } = checkRepo();
    expect(errors).toEqual([]);
  });
});
