import { describe, it, expect } from "vitest";
import { analyzeCommits } from "./analyze";
import { badgeSnippet } from "./badge";
import type { CommitMeta } from "@madeby/classify";

const human = (msg: string): CommitMeta => ({ message: msg, authorName: "Mac", authorEmail: "mac@example.com" });
const withClaude = (msg: string): CommitMeta => ({
  message: `${msg}\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`,
  authorName: "Mac",
  authorEmail: "mac@example.com",
});
const aiAuthored = (msg: string): CommitMeta => ({ message: msg, authorName: "Claude", authorEmail: "noreply@anthropic.com" });

describe("analyzeCommits", () => {
  const commits = [human("a"), human("b"), withClaude("c"), aiAuthored("d")];
  const r = analyzeCommits(commits);

  it("is a labeled estimate with per-class percentages", () => {
    expect(r.isEstimate).toBe(true);
    expect(r.totalCommits).toBe(4);
    expect(r.percent.human).toBe(50);
    expect(r.percent.with_ai).toBe(25);
    expect(r.percent.ai).toBe(25);
  });

  it("reports AI-involved percent (ai + with_ai)", () => {
    expect(r.aiInvolvedPercent).toBe(50);
  });

  it("surfaces top AI providers (dogfood: detects anthropic from our own trailer)", () => {
    expect(r.topProviders[0]?.provider).toBe("anthropic");
    expect(r.topProviders[0]?.count).toBe(2); // the with_ai trailer + the ai-authored commit
  });

  it("carries a mean confidence", () => {
    expect(r.meanConfidence).toBeGreaterThan(0);
    expect(r.meanConfidence).toBeLessThanOrEqual(1);
  });

  it("empty history yields zeros, not NaN", () => {
    const e = analyzeCommits([]);
    expect(e.totalCommits).toBe(0);
    expect(e.percent.human).toBe(0);
    expect(e.aiInvolvedPercent).toBe(0);
  });
});

describe("badgeSnippet", () => {
  it("is a live-served, linked markdown badge (pointer, never proof)", () => {
    const s = badgeSnippet("MacDougherty", "MadeBy");
    expect(s).toContain("https://madeby.fyi/b/MacDougherty/MadeBy.svg");
    expect(s).toContain("](https://madeby.fyi/MacDougherty/MadeBy)");
  });
});
