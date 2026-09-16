import { describe, it, expect } from "vitest";
import {
  EDGE_TYPES,
  EDGE_TIER_CAP,
  isRecognizedEdgeType,
  knownEdgeTypesForResolution,
  resolveEdgeTier,
  type EdgeResolutionContext,
} from "./edges";
import { canonicalizeEdge, edgePayload } from "./canonicalize";
import type { ClaimEdge, Signature } from "./model";

const sig = (over: Partial<Signature> = {}): Signature => ({
  signerKeyId: "k",
  value: "v",
  carrierId: "in-toto",
  signedAt: "2026-01-01T00:00:00Z",
  ...over,
});

const edge = (over: Partial<ClaimEdge> = {}): ClaimEdge => ({
  type: "DERIVED_FROM",
  fromClaimId: "a",
  toClaimId: "b",
  method: "declared",
  signature: sig(),
  ...over,
});

// Strongest attacker assumptions unless the case is about them: signature verifies, signer verified.
const ctx = (over: Partial<EdgeResolutionContext> = {}): EdgeResolutionContext => ({
  knownEdgeTypes: knownEdgeTypesForResolution(),
  verifySignature: () => true,
  isSignerVerified: () => true,
  ...over,
});

const dec = (u: Uint8Array) => new TextDecoder().decode(u);

describe("edge-type registry (open, self-describing)", () => {
  it("recognizes the code-native, contradiction, and code↔artifact types", () => {
    for (const t of ["PART_OF", "DERIVED_FROM", "DISPUTES", "IMPLEMENTS", "MOTIVATED_BY", "DECIDED_BY", "DISCUSSED_IN"]) {
      expect(isRecognizedEdgeType(t), t).toBe(true);
    }
  });

  it("treats unknown types as unrecognized (degrade, don't crash)", () => {
    expect(isRecognizedEdgeType("TOTALLY_MADE_UP")).toBe(false);
  });

  it("categorizes the known types", () => {
    expect(EDGE_TYPES.get("PART_OF")?.category).toBe("composition");
    expect(EDGE_TYPES.get("DERIVED_FROM")?.category).toBe("derivation");
    expect(EDGE_TYPES.get("DISPUTES")?.category).toBe("contradiction");
    expect(EDGE_TYPES.get("IMPLEMENTS")?.category).toBe("relation");
  });
});

describe("resolveEdgeTier — fail-safe (the only way up is a declared, signed, verified edge)", () => {
  it("declared + valid sig + verified signer + known type → verified (the cap)", () => {
    expect(resolveEdgeTier(edge(), ctx())).toBe("verified");
    expect(EDGE_TIER_CAP).toBe("verified");
  });

  it("an inferred edge caps at asserted even when signed + known", () => {
    expect(resolveEdgeTier(edge({ method: "inferred" }), ctx())).toBe("asserted");
  });

  it("an unrecognized edge type caps at asserted", () => {
    expect(resolveEdgeTier(edge({ type: "MADE_UP" }), ctx())).toBe("asserted");
  });

  it("a declared but unsigned edge caps at asserted", () => {
    expect(resolveEdgeTier(edge({ signature: undefined }), ctx())).toBe("asserted");
  });

  it("a forged/invalid signature caps at asserted", () => {
    expect(resolveEdgeTier(edge(), ctx({ verifySignature: () => false }))).toBe("asserted");
  });

  it("an anonymous (unverified) signer caps at asserted", () => {
    expect(resolveEdgeTier(edge(), ctx({ isSignerVerified: () => false }))).toBe("asserted");
  });

  it("never returns 'bound' — edges relate, they do not byte-bind", () => {
    // exhaustively: across every recognized type, the best achievable tier is 'verified'
    for (const t of EDGE_TYPES.keys()) {
      expect(resolveEdgeTier(edge({ type: t }), ctx())).not.toBe("bound");
    }
  });
});

describe("canonicalizeEdge — signable, deterministic, tamper-evident", () => {
  it("excludes the signature and is order-independent on inputs", () => {
    const payload = edgePayload(edge());
    expect(JSON.stringify(payload)).not.toContain("signerKeyId");
  });

  it("altering a signed field changes the canonical bytes", () => {
    const base = dec(canonicalizeEdge(edge({ signature: undefined })));
    const tamperedType = dec(canonicalizeEdge(edge({ type: "PART_OF", signature: undefined })));
    const tamperedTo = dec(canonicalizeEdge(edge({ toClaimId: "attacker", signature: undefined })));
    const tamperedMethod = dec(canonicalizeEdge(edge({ method: "inferred", signature: undefined })));
    expect(base).not.toBe(tamperedType);
    expect(base).not.toBe(tamperedTo);
    expect(base).not.toBe(tamperedMethod);
  });

  it("omitting optional evidence does not change the bytes vs. undefined evidence", () => {
    const a = dec(canonicalizeEdge(edge({ evidence: undefined, signature: undefined })));
    const b = dec(canonicalizeEdge({ type: "DERIVED_FROM", fromClaimId: "a", toClaimId: "b", method: "declared" }));
    expect(a).toBe(b);
  });
});
