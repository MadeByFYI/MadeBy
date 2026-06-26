import { describe, it, expect } from "vitest";
import { computeCoverage, percentByTier } from "./coverage";
import type { ResolutionContext } from "./resolve";
import type { Claim, Carrier } from "./model";
import type { Fingerprint } from "./fingerprint";

const exactFp: Fingerprint = { algorithm: "sha256", target: "FILE", value: "abc" };

function ctx(): ResolutionContext {
  return {
    knownCarriers: new Map<string, Carrier>([["in-toto", { id: "in-toto", verificationCapable: true }]]),
    verifySignature: () => true,
    isSignerVerified: () => true,
  };
}

function claim(id: string, over: Partial<Claim> = {}): Claim {
  return {
    id,
    subject: exactFp,
    attribution: { identityId: "id1", role: "creator" },
    assertedTier: "asserted",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("computeCoverage", () => {
  const claims: Claim[] = [
    claim("a"),
    claim("b", { assertedTier: "bound", signature: { signerKeyId: "k", value: "x", carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" } }),
    claim("c", { attribution: { identityId: "", role: "creator" } }), // unattributed
  ];

  it("is always a labeled estimate carrying its tier distribution", () => {
    const view = computeCoverage(claims, ctx());
    expect(view.isEstimate).toBe(true);
    expect(view.methodology.length).toBeGreaterThan(0);
    expect(view.total).toBe(3);
    expect(view.tierDistribution.asserted).toBe(2);
    expect(view.tierDistribution.bound).toBe(1);
  });

  it("surfaces the unattributed fraction honestly", () => {
    const view = computeCoverage(claims, ctx());
    expect(view.attributed).toBe(2);
    expect(view.unattributed).toBe(1);
  });

  it("does not mutate its input (it's a view, not stored state)", () => {
    const snapshot = JSON.stringify(claims);
    computeCoverage(claims, ctx());
    expect(JSON.stringify(claims)).toBe(snapshot);
  });

  it("percentByTier derives percentages summing to 100", () => {
    const pct = percentByTier(computeCoverage(claims, ctx()));
    const sum = pct.asserted + pct.sworn + pct.verified + pct.bound;
    expect(sum).toBeCloseTo(100, 6);
  });

  it("empty input yields zeroed percentages, not NaN", () => {
    const pct = percentByTier(computeCoverage([], ctx()));
    expect(pct.asserted).toBe(0);
  });
});
