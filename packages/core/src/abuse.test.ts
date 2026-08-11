// Red-team vectors for the free-tier social/economic abuse surface (#72) — the half that isn't
// crypto forgery. These exercise the two code-enforced controls: bounding adjudication-by-display,
// and flagging corpus-poisoning. Both FLAG/BOUND, never delete (invariant #9).

import { describe, it, expect } from "vitest";
import { boundClaimStandings, detectCorpusPoisoning } from "./abuse";
import type { ClaimStanding } from "./contention";
import type { Claim } from "./model";
import type { TrustTier } from "./tiers";

function standing(tier: TrustTier): ClaimStanding {
  return {
    claim: { id: "c", subject: { algorithm: "sha256", target: "FILE", value: "v" }, attribution: { identityId: "x", role: "creator" }, assertedTier: tier, createdAt: "2026-01-01" },
    authenticity: tier,
    origination: { nativeProvenance: false, isDerivative: false, priorityAt: "2026-01-01" },
    originationRank: 2,
  };
}

describe("boundClaimStandings — red-team: adjudication-by-display flood", () => {
  it("collapses a flood of asserted claims behind an 'N other asserted claims' expander", () => {
    const standings = [standing("verified"), ...Array.from({ length: 15 }, () => standing("asserted"))];
    const b = boundClaimStandings(standings, { maxAsserted: 3 });
    expect(b.shown.filter((s) => s.authenticity === "asserted")).toHaveLength(3);
    expect(b.shown.some((s) => s.authenticity === "verified")).toBe(true); // evidence-backed always shown
    expect(b.collapsed).toBe(12);
    expect(b.collapsedNote).toBe("12 other asserted claims");
  });

  it("never collapses evidence-backed claims, no matter how many", () => {
    const standings = Array.from({ length: 20 }, () => standing("verified"));
    const b = boundClaimStandings(standings);
    expect(b.collapsed).toBe(0);
    expect(b.shown).toHaveLength(20);
  });

  it("does not collapse a small asserted set (no expander noise)", () => {
    const b = boundClaimStandings([standing("asserted"), standing("asserted")], { maxAsserted: 3 });
    expect(b.collapsed).toBe(0);
    expect(b.collapsedNote).toBeUndefined();
  });

  it("singular label reads naturally", () => {
    const b = boundClaimStandings(Array.from({ length: 4 }, () => standing("asserted")), { maxAsserted: 3 });
    expect(b.collapsedNote).toBe("1 other asserted claim");
  });
});

describe("detectCorpusPoisoning — red-team: mass-squatting via cheap claims", () => {
  const claim = (actor: string, subject: string, signed = false): Claim => ({
    id: `${actor}:${subject}`,
    subject: { algorithm: "sha256", target: "FILE", value: subject },
    attribution: { identityId: actor, role: "creator" },
    assertedTier: "asserted",
    ...(signed ? { signature: { signerKeyId: "k", value: "sig", carrierId: "cx", signedAt: "2026-01-01" } } : {}),
    createdAt: "2026-01-01",
  });

  it("flags an actor asserting authorship over many distinct subjects (unsigned)", () => {
    const claims = Array.from({ length: 12 }, (_, i) => claim("squatter", `repo${i}`));
    const flags = detectCorpusPoisoning(claims, { threshold: 10 });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.actorId).toBe("squatter");
    expect(flags[0]!.cheapSubjectCount).toBe(12);
  });

  it("does not flag a normal actor with a few claims", () => {
    const claims = [claim("alice", "a"), claim("alice", "b"), claim("alice", "c")];
    expect(detectCorpusPoisoning(claims, { threshold: 10 })).toHaveLength(0);
  });

  it("signed (identity-cost-paid) claims do NOT count toward the poison signal", () => {
    const claims = Array.from({ length: 12 }, (_, i) => claim("maintainer", `repo${i}`, true));
    expect(detectCorpusPoisoning(claims, { threshold: 10 })).toHaveLength(0);
  });

  it("counts distinct subjects, not claim volume (re-asserting one subject isn't spread)", () => {
    const claims = Array.from({ length: 30 }, () => claim("noisy", "same-repo"));
    expect(detectCorpusPoisoning(claims, { threshold: 10 })).toHaveLength(0);
  });

  it("flags per actor and returns review signals only (never deletes)", () => {
    const claims = [...Array.from({ length: 11 }, (_, i) => claim("bad", `s${i}`)), claim("good", "x")];
    const flags = detectCorpusPoisoning(claims, { threshold: 10 });
    expect(flags.map((f) => f.actorId)).toEqual(["bad"]);
  });
});
