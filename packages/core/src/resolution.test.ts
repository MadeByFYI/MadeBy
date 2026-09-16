import { describe, it, expect } from "vitest";
import { resolve, resolveClaims } from "./resolution";
import type { ResolutionContext } from "./resolve";
import type { Claim, Carrier, Signature } from "./model";
import type { Fingerprint } from "./fingerprint";

const fp: Fingerprint = { algorithm: "sha256", target: "FILE", value: "abc" };
const sig: Signature = { signerKeyId: "k", value: "v", carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" };

function claim(over: Partial<Claim>): Claim {
  return {
    id: "c",
    subject: fp,
    attribution: { identityId: "id", role: "creator" },
    assertedTier: "asserted",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

// ctx where signatures verify and signer is known (so 'verified'/'bound' are reachable)
function ctx(): ResolutionContext {
  return {
    knownCarriers: new Map<string, Carrier>([["in-toto", { id: "in-toto", verificationCapable: true }]]),
    verifySignature: () => true,
    isSignerVerified: () => true,
    recognizesSwornRepresentation: () => true,
  };
}

describe("resolution policy", () => {
  it("orders by effective tier (highest first)", () => {
    const claims = [
      claim({ id: "asserted", assertedTier: "asserted" }),
      claim({ id: "bound", assertedTier: "bound", subject: fp, signature: sig }),
      claim({ id: "verified", assertedTier: "verified", signature: sig }),
    ];
    const ordered = resolveClaims(claims, ctx());
    expect(ordered.map((r) => r.claim.id)).toEqual(["bound", "verified", "asserted"]);
  });

  it("breaks tier ties by earliest timestamp (first-to-claim priority)", () => {
    const claims = [
      claim({ id: "later", createdAt: "2026-03-01T00:00:00Z" }),
      claim({ id: "earlier", createdAt: "2026-01-01T00:00:00Z" }),
    ];
    expect(resolveClaims(claims, ctx()).map((r) => r.claim.id)).toEqual(["earlier", "later"]);
  });

  it("returns ALL claims ordered (orders evidence, never drops/adjudicates)", () => {
    const claims = [claim({ id: "a" }), claim({ id: "b" }), claim({ id: "c" })];
    expect(resolve(fp, claims, ctx()).claims).toHaveLength(3);
  });

  it("best is the top-ranked claim; null when there are none", () => {
    const r = resolve(fp, [claim({ id: "only" })], ctx());
    expect(r.best?.claim.id).toBe("only");
    expect(resolve(fp, [], ctx()).best).toBeNull();
  });

  it("fail-safe: with no signature verification, even a 'bound' claim resolves to asserted", () => {
    const noVerify: ResolutionContext = { ...ctx(), verifySignature: () => false };
    const r = resolve(fp, [claim({ assertedTier: "bound", signature: sig })], noVerify);
    expect(r.best?.tier).toBe("asserted");
  });
});
