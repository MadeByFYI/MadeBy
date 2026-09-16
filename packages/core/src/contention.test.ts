import { describe, it, expect } from "vitest";
import { resolveContention, type OriginationInput } from "./contention";
import type { ResolutionContext } from "./resolve";
import type { Claim, Carrier, Signature } from "./model";

const sig = (): Signature => ({ signerKeyId: "k", value: "v", carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" });

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: "c",
  subject: { algorithm: "sha256", target: "FILE", value: "deadbeef" },
  attribution: { identityId: "a", role: "creator" },
  assertedTier: "asserted",
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

const ctx = (over: Partial<ResolutionContext> = {}): ResolutionContext => ({
  knownCarriers: new Map<string, Carrier>([["in-toto", { id: "in-toto", verificationCapable: true }]]),
  verifySignature: () => true,
  isSignerVerified: () => true,
  recognizesSwornRepresentation: () => true,
  ...over,
});

const indexOfOrigin = (claims: Claim[], originClaim: Claim | undefined) =>
  originClaim ? claims.indexOf(originClaim) : null;

describe("resolveContention — evidence dominance, never adjudication", () => {
  it("a single claim is the origin, uncontested", () => {
    const c = claim();
    const r = resolveContention([c], ctx());
    expect(r.open).toBe(false);
    expect(r.origin?.claim).toBe(c);
    expect(r.authenticationDivergesFromOrigination).toBe(false);
  });

  it("an empty set has no origin and is not open", () => {
    const r = resolveContention([], ctx());
    expect(r.standings).toHaveLength(0);
    expect(r.origin).toBeNull();
    expect(r.open).toBe(false);
  });

  it("a verified owner outranks a (same-content) asserted squatter — squatting fails", () => {
    const squatter = claim({ assertedTier: "asserted" });
    const owner = claim({ assertedTier: "verified", signature: sig() });
    const r = resolveContention([squatter, owner], ctx());
    expect(r.open).toBe(false);
    expect(r.origin?.claim).toBe(owner);
  });

  it("priority NEVER overrides stronger evidence: an earlier squatter still loses to a later verified owner", () => {
    const squatter = claim({ assertedTier: "asserted", createdAt: "2020-01-01T00:00:00Z" }); // much earlier
    const owner = claim({ assertedTier: "verified", signature: sig(), createdAt: "2026-01-01T00:00:00Z" });
    const r = resolveContention([squatter, owner], ctx());
    expect(r.origin?.claim).toBe(owner);
  });

  it("a valid signature over COPIED bytes does not establish origin → open + divergence (invariant #10)", () => {
    const impostor = claim({ assertedTier: "bound", signature: sig() }); // bound authenticity...
    const trueOrigin = claim({ assertedTier: "asserted" }); // ...but only asserted, yet the real origin
    const inputs: (OriginationInput | undefined)[] = [{ isDerivative: true }, { isDerivative: false }];
    const r = resolveContention([impostor, trueOrigin], ctx(), inputs);
    expect(r.open).toBe(true);
    expect(r.origin).toBeNull(); // never crown the impostor
    expect(r.authenticationDivergesFromOrigination).toBe(true);
  });

  it("verify-and-outrank: once the true origin signs, it dominates the derivative impostor", () => {
    const impostor = claim({ assertedTier: "bound", signature: sig() });
    const origin = claim({ assertedTier: "bound", signature: sig() });
    const inputs: (OriginationInput | undefined)[] = [{ isDerivative: true }, { isDerivative: false }];
    const r = resolveContention([impostor, origin], ctx(), inputs);
    expect(r.open).toBe(false);
    expect(r.origin?.claim).toBe(origin);
    expect(r.authenticationDivergesFromOrigination).toBe(false);
  });

  it("a genuine symmetric tie stays OPEN (not divergent, never a fabricated winner)", () => {
    const a = claim({ assertedTier: "verified", signature: sig() });
    const b = claim({ assertedTier: "verified", signature: sig() });
    const r = resolveContention([a, b], ctx());
    expect(r.open).toBe(true);
    expect(r.origin).toBeNull();
    expect(r.authenticationDivergesFromOrigination).toBe(false);
  });

  it("priority alone NEVER crowns: equal evidence + different timestamps stays open", () => {
    const a = claim({ assertedTier: "verified", signature: sig() });
    const b = claim({ assertedTier: "verified", signature: sig() });
    const inputs: (OriginationInput | undefined)[] = [
      { priorityAt: "2024-01-01T00:00:00Z" },
      { priorityAt: "2026-01-01T00:00:00Z" },
    ];
    const r = resolveContention([a, b], ctx(), inputs);
    expect(r.open).toBe(true);
    expect(r.origin).toBeNull();
    // earlier one is displayed first, but it is NOT crowned
    expect(indexOfOrigin([a, b], r.origin?.claim)).toBeNull();
    expect(r.standings[0]?.claim).toBe(a);
  });

  it("a fuzzy-only origin still beats a derivative of it (origination evidence discriminates)", () => {
    const fuzzyOrigin = claim({ assertedTier: "asserted", subject: { algorithm: "structural-v1", target: "FILE", value: "x" } });
    const derivative = claim({ assertedTier: "asserted", subject: { algorithm: "structural-v1", target: "FILE", value: "x" } });
    const inputs: (OriginationInput | undefined)[] = [{ isDerivative: false }, { isDerivative: true }];
    const r = resolveContention([fuzzyOrigin, derivative], ctx(), inputs);
    expect(r.origin?.claim).toBe(fuzzyOrigin);
    expect(r.open).toBe(false);
  });
});

describe("origination rank — exact weights (origin > derivative; native adds)", () => {
  const rank = (inp: OriginationInput) => resolveContention([claim()], ctx(), [inp]).standings[0]!.originationRank;
  it("origin + native provenance = 3", () => expect(rank({ isDerivative: false, nativeProvenance: true })).toBe(3));
  it("origin + no native provenance = 2", () => expect(rank({ isDerivative: false, nativeProvenance: false })).toBe(2));
  it("derivative + native provenance = 1", () => expect(rank({ isDerivative: true, nativeProvenance: true })).toBe(1));
  it("derivative + no native provenance = 0", () => expect(rank({ isDerivative: true, nativeProvenance: false })).toBe(0));
});

describe("origination defaults (derived from the claim when not supplied)", () => {
  it("nativeProvenance defaults to whether the subject is an exact fingerprint", () => {
    const exact = resolveContention([claim({ subject: { algorithm: "sha256", target: "FILE", value: "x" } })], ctx()).standings[0]!;
    const fuzzy = resolveContention([claim({ subject: { algorithm: "structural-v1", target: "FILE", value: "x" } })], ctx()).standings[0]!;
    expect(exact.origination.nativeProvenance).toBe(true);
    expect(fuzzy.origination.nativeProvenance).toBe(false);
  });

  it("isDerivative defaults to false (treated as an origin)", () => {
    const s = resolveContention([claim()], ctx()).standings[0]!;
    expect(s.origination.isDerivative).toBe(false);
  });

  it("priorityAt defaults to the claim's createdAt", () => {
    const s = resolveContention([claim({ createdAt: "2025-05-05T00:00:00Z" })], ctx()).standings[0]!;
    expect(s.origination.priorityAt).toBe("2025-05-05T00:00:00Z");
  });

  it("explicit inputs override the defaults", () => {
    const s = resolveContention([claim({ subject: { algorithm: "sha256", target: "FILE", value: "x" } })], ctx(), [
      { nativeProvenance: false, isDerivative: true, priorityAt: "2030-01-01T00:00:00Z" },
    ]).standings[0]!;
    expect(s.origination.nativeProvenance).toBe(false);
    expect(s.origination.isDerivative).toBe(true);
    expect(s.origination.priorityAt).toBe("2030-01-01T00:00:00Z");
  });
});

describe("display ordering of standings (origination desc → tier desc → priority asc)", () => {
  it("orders by origination rank first (higher first)", () => {
    const lo = claim();
    const hi = claim();
    const r = resolveContention([lo, hi], ctx(), [{ isDerivative: true }, { isDerivative: false }]);
    expect(r.standings[0]!.claim).toBe(hi); // rank 3 before rank 1
    expect(r.standings[1]!.claim).toBe(lo);
  });

  it("breaks equal origination by tier (higher first)", () => {
    const asserted = claim({ assertedTier: "asserted" });
    const verified = claim({ assertedTier: "verified", signature: sig() });
    const r = resolveContention([asserted, verified], ctx()); // both rank 3 (native, origin)
    expect(r.standings[0]!.claim).toBe(verified);
    expect(r.standings[1]!.claim).toBe(asserted);
  });

  it("breaks equal origination + tier by priority (earliest first), both directions", () => {
    const early = claim({ assertedTier: "verified", signature: sig() });
    const late = claim({ assertedTier: "verified", signature: sig() });
    const aFirst = resolveContention([late, early], ctx(), [{ priorityAt: "2026-01-01T00:00:00Z" }, { priorityAt: "2020-01-01T00:00:00Z" }]);
    expect(aFirst.standings[0]!.claim).toBe(early); // 2020 before 2026 regardless of input order
    const bFirst = resolveContention([early, late], ctx(), [{ priorityAt: "2020-01-01T00:00:00Z" }, { priorityAt: "2026-01-01T00:00:00Z" }]);
    expect(bFirst.standings[0]!.claim).toBe(early);
  });
});
