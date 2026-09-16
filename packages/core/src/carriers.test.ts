import { describe, it, expect } from "vitest";
import { CARRIER_REGISTRY, carriersForResolution, parseEnvelope } from "./carriers";
import { canonicalize } from "./canonicalize";
import { resolveTier } from "./resolve";
import type { Claim, Signature } from "./model";
import type { Fingerprint } from "./fingerprint";

const decode = (u: Uint8Array) => new TextDecoder().decode(u);
const exactFp: Fingerprint = { algorithm: "sha256", target: "FILE", value: "abc123" };

function claim(over: Partial<Claim> = {}): Claim {
  return {
    id: "c1",
    subject: exactFp,
    attribution: { identityId: "id1", role: "creator" },
    assertedTier: "bound",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}
const sig: Signature = { signerKeyId: "k1", value: "deadbeef", carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" };

describe("carrier round-trips preserve the canonical payload", () => {
  const c = claim();
  const original = decode(canonicalize(c));

  for (const [id, binding] of CARRIER_REGISTRY) {
    it(`${id}: serialize → parse is byte-identical`, () => {
      const env = binding.serialize(c, sig);
      const parsed = parseEnvelope(env);
      expect(parsed?.recognized).toBe(true);
      expect(parsed?.carrierId).toBe(id);
      expect(decode(canonicalize(parsed!.claim))).toBe(original);
      expect(parsed?.signature?.value).toBe(sig.value);
    });
  }
});

describe("carrier-independence (the headline acceptance)", () => {
  it("a signature minted in in-toto still verifies after re-encoding into git-notes", () => {
    const c = claim();
    const bytesAtMint = decode(canonicalize(c)); // what the signature covers

    const inTotoEnv = CARRIER_REGISTRY.get("in-toto")!.serialize(c, sig);
    const fromInToto = parseEnvelope(inTotoEnv)!;

    const gitEnv = CARRIER_REGISTRY.get("git-notes")!.serialize(fromInToto.claim, fromInToto.signature);
    const fromGit = parseEnvelope(gitEnv)!;

    // Canonical bytes are identical across the chain ⇒ the original signature still verifies.
    expect(decode(canonicalize(fromGit.claim))).toBe(bytesAtMint);
    expect(fromGit.signature?.value).toBe(sig.value);
  });
});

describe("unknown-carrier degradation (TESTING.md §3)", () => {
  it("parses best-effort but flags recognized:false", () => {
    const env = { carrier: "some-future-format", predicate: CARRIER_REGISTRY.get("in-toto")!.serialize(claim()).predicate! };
    const parsed = parseEnvelope(env);
    expect(parsed?.recognized).toBe(false);
  });

  it("the registry drives resolveTier capping: unknown carrier → asserted, known → bound", () => {
    const ctx = {
      knownCarriers: carriersForResolution(),
      verifySignature: () => true,
      isSignerVerified: () => true,
      recognizesSwornRepresentation: () => true,
    };
    const unknown = claim({ signature: { ...sig, carrierId: "some-future-format" } });
    expect(resolveTier(unknown, ctx)).toBe("asserted");

    const known = claim({ signature: { ...sig, carrierId: "in-toto" } });
    expect(resolveTier(known, ctx)).toBe("bound");
  });
});
