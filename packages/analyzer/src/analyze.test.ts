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

describe("analyzeCommits — answers WHO", () => {
  const commits = [human("a"), human("b"), withClaude("c"), aiAuthored("d")];
  const r = analyzeCommits(commits);

  it("names the contributors (human operators + AI models), by commit count", () => {
    // Mac authored a, b, c (3); Claude/anthropic appears in c (trailer) + d (author) = 2
    expect(r.contributors[0]).toMatchObject({ kind: "human", name: "Mac", commits: 3 });
    const ai = r.contributors.find((c) => c.kind === "ai");
    expect(ai).toMatchObject({ name: "anthropic", commits: 2 });
  });

  it("always names someone for a non-empty history (never abdicates the question)", () => {
    expect(r.contributors.length).toBeGreaterThan(0);
  });

  it("puts the uncertainty in the tier + caveat, not in the answer", () => {
    expect(r.tier).toBe("asserted");
    expect(r.caveat.length).toBeGreaterThan(0);
  });

  it("keeps the human/AI split as a facet (labeled estimate)", () => {
    expect(r.isEstimate).toBe(true);
    expect(r.totalCommits).toBe(4);
    expect(r.percent.human).toBe(50);
    expect(r.percent.with_ai).toBe(25);
    expect(r.percent.ai).toBe(25);
    expect(r.aiInvolvedPercent).toBe(50);
  });

  it("Disclosure Score = commits disclosing origin via a trailer OR a signature; rest undisclosed", () => {
    // a: unsigned human (undisclosed) · b: signed human (disclosed-by-signature) ·
    // c: AI trailer (disclosed-by-trailer) · d: AI author, unsigned (disclosed-by-trailer)
    const cs: CommitMeta[] = [
      { message: "a", authorName: "Mac", authorEmail: "mac@x.com" },
      { message: "b", authorName: "Mac", authorEmail: "mac@x.com", signed: true },
      withClaude("c"),
      aiAuthored("d"),
    ];
    const d = analyzeCommits(cs);
    expect(d.disclosedByTrailerPercent).toBe(50); // c + d
    expect(d.disclosedBySignaturePercent).toBe(25); // b
    expect(d.disclosedPercent).toBe(75); // b, c, d (a is the only undisclosed one)
    expect(d.undisclosedPercent).toBe(25); // a
  });

  it("never relabels the undisclosed blind spot: an unsigned, no-trailer repo is 100% undisclosed", () => {
    const d = analyzeCommits([human("x"), human("y")]);
    expect(d.disclosedPercent).toBe(0);
    expect(d.undisclosedPercent).toBe(100); // NOT "100% human"
  });

  it("empty history yields no contributors and zeros, not NaN", () => {
    const e = analyzeCommits([]);
    expect(e.contributors).toEqual([]);
    expect(e.totalCommits).toBe(0);
    expect(e.aiInvolvedPercent).toBe(0);
    expect(e.unattributedPercent).toBe(0);
    expect(e.disclosedPercent).toBe(0);
    expect(e.undisclosedPercent).toBe(0);
  });

  it("counts only author-less, no-AI-signal commits as fully unattributed", () => {
    const authored = analyzeCommits([{ message: "fix", authorName: "Mac", authorEmail: "mac@x.com" }]);
    expect(authored.unattributedPercent).toBe(0); // named author → attributed, not unattributed

    const anon = analyzeCommits([{ message: "fix", authorName: "", authorEmail: "" }]);
    expect(anon.unattributedPercent).toBe(100); // no author + no AI signal → genuinely unknown

    const anonButAi = analyzeCommits([{ message: "gen\n\nCo-Authored-By: Claude <noreply@anthropic.com>", authorName: "", authorEmail: "" }]);
    expect(anonButAi.unattributedPercent).toBe(0); // no author but AI signal → provable-AI, not unattributed
  });
});

describe("badgeSnippet", () => {
  it("is a live-served, linked markdown badge (pointer, never proof)", () => {
    const s = badgeSnippet("MacDougherty", "MadeBy");
    expect(s).toContain("https://madeby.fyi/b/MacDougherty/MadeBy.svg");
    expect(s).toContain("](https://madeby.fyi/MacDougherty/MadeBy)");
  });
});
