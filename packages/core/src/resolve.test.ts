import { describe, it, expect } from "vitest";
import { resolveTier } from "./resolve";
import type { ResolutionContext } from "./resolve";
import type { Claim, Carrier, Signature } from "./model";
import type { Fingerprint } from "./fingerprint";

const exactFp: Fingerprint = { algorithm: "sha256", target: "FILE", value: "abc123" };
const fuzzyFp: Fingerprint = { algorithm: "structural-v1", target: "FILE", value: "xyz789" };

function sig(carrierId = "in-toto"): Signature {
  return { signerKeyId: "k1", value: "deadbeef", carrierId, signedAt: "2026-01-01T00:00:00Z" };
}

function claim(over: Partial<Claim> = {}): Claim {
  return {
    id: "c1",
    subject: exactFp,
    attribution: { identityId: "id1", role: "creator" },
    assertedTier: "asserted",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function ctx(over: Partial<ResolutionContext> = {}): ResolutionContext {
  return {
    knownCarriers: new Map<string, Carrier>([["in-toto", { id: "in-toto", verificationCapable: true }]]),
    verifySignature: () => true,
    isSignerVerified: () => true,
    ...over,
  };
}

describe("resolveTier — happy paths", () => {
  it("asserted is the floor", () => {
    expect(resolveTier(claim({ assertedTier: "asserted" }), ctx())).toBe("asserted");
  });
  it("sworn requires a sworn overlay", () => {
    const sworn = { representationCode: "PERJURY", signatureName: "Jane Doe", signedAt: "2026-01-01T00:00:00Z" };
    expect(resolveTier(claim({ assertedTier: "sworn", sworn }), ctx())).toBe("sworn");
  });
  it("verified with valid sig + known carrier + verified signer", () => {
    expect(resolveTier(claim({ assertedTier: "verified", signature: sig() }), ctx())).toBe("verified");
  });
  it("bound with valid sig + exact fingerprint", () => {
    expect(resolveTier(claim({ assertedTier: "bound", subject: exactFp, signature: sig() }), ctx())).toBe("bound");
  });
});

describe("resolveTier — fails safe (never escalates above the evidence)", () => {
  it("sworn without an overlay degrades to asserted", () => {
    expect(resolveTier(claim({ assertedTier: "sworn" }), ctx())).toBe("asserted");
  });
  it("verified/bound without a signature caps at asserted", () => {
    expect(resolveTier(claim({ assertedTier: "verified" }), ctx())).toBe("asserted");
    expect(resolveTier(claim({ assertedTier: "bound" }), ctx())).toBe("asserted");
  });
  it("UNKNOWN carrier caps at asserted — even when 'bound' is requested", () => {
    const c = claim({ assertedTier: "bound", subject: exactFp, signature: sig("mystery-carrier") });
    expect(resolveTier(c, ctx())).toBe("asserted");
  });
  it("a carrier we can't verify (verificationCapable=false) caps at asserted", () => {
    const c = claim({ assertedTier: "verified", signature: sig("weak") });
    const context = ctx({
      knownCarriers: new Map<string, Carrier>([["weak", { id: "weak", verificationCapable: false }]]),
    });
    expect(resolveTier(c, context)).toBe("asserted");
  });
  it("a forged/invalid signature caps at asserted", () => {
    const c = claim({ assertedTier: "bound", signature: sig() });
    expect(resolveTier(c, ctx({ verifySignature: () => false }))).toBe("asserted");
  });
  it("an anonymous (unverified) signer caps at asserted", () => {
    const c = claim({ assertedTier: "verified", signature: sig() });
    expect(resolveTier(c, ctx({ isSignerVerified: () => false }))).toBe("asserted");
  });
  it("bound over a fuzzy fingerprint degrades to verified (no byte binding)", () => {
    const c = claim({ assertedTier: "bound", subject: fuzzyFp, signature: sig() });
    expect(resolveTier(c, ctx())).toBe("verified");
  });
});
