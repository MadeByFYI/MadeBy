import { describe, it, expect } from "vitest";
import { jcs, canonicalize, claimPayload, claimFromPayload } from "./canonicalize";
import type { Claim } from "./model";
import type { Fingerprint } from "./fingerprint";

const decode = (u: Uint8Array) => new TextDecoder().decode(u);

const fp: Fingerprint = { algorithm: "sha256", target: "FILE", value: "abc123" };
function claim(over: Partial<Claim> = {}): Claim {
  return {
    id: "c1",
    subject: fp,
    attribution: { identityId: "id1", role: "creator" },
    assertedTier: "asserted",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("jcs (RFC 8785-aligned)", () => {
  it("sorts object keys", () => {
    expect(jcs({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
  it("is independent of insertion order", () => {
    expect(jcs({ a: 1, b: { d: 4, c: 3 } })).toBe(jcs({ b: { c: 3, d: 4 }, a: 1 }));
  });
  it("handles arrays, booleans, null", () => {
    expect(jcs([true, false, null, "x"])).toBe('[true,false,null,"x"]');
  });
  it("rejects non-integer and non-finite numbers (v0)", () => {
    expect(() => jcs(1.5)).toThrow();
    expect(() => jcs(Infinity)).toThrow();
    expect(() => jcs(NaN)).toThrow();
  });
});

describe("claim canonicalization", () => {
  it("excludes id and signature (they don't affect the signed bytes)", () => {
    const a = canonicalize(claim({ id: "x" }));
    const b = canonicalize(
      claim({
        id: "completely-different",
        signature: { signerKeyId: "k", value: "v", carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" },
      }),
    );
    expect(decode(a)).toBe(decode(b));
  });

  it("round-trips through claimFromPayload(claimPayload(...)) byte-identically", () => {
    const c = claim({
      assertedTier: "bound",
      attribution: { identityId: "id9", role: "generator", aiProvider: "anthropic", aiModel: "claude", operatorId: "op1" },
    });
    const rebuilt = claimFromPayload(claimPayload(c));
    expect(decode(canonicalize(rebuilt))).toBe(decode(canonicalize(c)));
  });

  it("treats the subject hash as opaque (two-hash rule): value is copied verbatim", () => {
    const c = claim({ subject: { algorithm: "git-blob-sha1", target: "FILE", value: "deadbeef" } });
    expect(decode(canonicalize(c))).toContain("deadbeef");
  });
});
