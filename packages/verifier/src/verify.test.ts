import { describe, it, expect } from "vitest";
import { CARRIER_REGISTRY, sha256Fingerprint, type Claim, type Json } from "@madeby/core";
import { signClaim, verifyAttestation, verifyClaimSignature, generateSigningKeyPair } from "./index";
import vectorsJson from "./vectors/verification-v0.json";

interface VectorCase {
  name: string;
  content?: string;
  contentHex?: string;
  envelope: Record<string, Json>;
  verify: { trustSigner: boolean; withContent: boolean };
  expect: Partial<{
    signatureValid: boolean;
    recognizedCarrier: boolean;
    subjectIsNative: boolean;
    subjectIsExact: boolean;
    contentMatches: boolean | null;
    confirmedTier: string;
  }>;
}
const vectors = vectorsJson as unknown as { suite: string; testKey: { publicKeyHex: string; privateKeyPkcs8Hex: string }; cases: VectorCase[] };
const hexToBytes = (hex: string) => Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

describe("published verification vectors — a third party gets these exact verdicts", () => {
  for (const c of vectors.cases) {
    it(c.name, async () => {
      const content = c.verify.withContent && c.contentHex ? hexToBytes(c.contentHex) : undefined;
      const result = await verifyAttestation(c.envelope, { content, trustSigner: c.verify.trustSigner });
      for (const [k, v] of Object.entries(c.expect)) {
        expect(result[k as keyof typeof result], `${c.name} :: ${k} :: ${JSON.stringify(result.reasons)}`).toEqual(v);
      }
    });
  }
});

describe("signature suite is deterministic and reproducible", () => {
  it("re-signing the vector claim with the test key reproduces the published signature byte-for-byte", async () => {
    const enc = new TextEncoder();
    const contentBytes = enc.encode('export const greeting = "hello, provenance";\n');
    const subject = await sha256Fingerprint(contentBytes, "FILE");
    const claim: Claim = { id: "", subject, attribution: { identityId: "did:web:alice.example", role: "creator" }, assertedTier: "bound", createdAt: "2026-01-01T00:00:00Z" };
    const sig = await signClaim(claim, vectors.testKey, { carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" });
    const published = (vectors.cases[0]!.envelope as { signatures: { value: string }[] }).signatures[0]!.value;
    expect(sig.value).toEqual(published);
  });
});

describe("round-trip and fail-safe behavior", () => {
  it("a freshly minted claim verifies, and carrier-independence holds across carriers", async () => {
    const keys = await generateSigningKeyPair();
    const contentBytes = new TextEncoder().encode("function add(a,b){return a+b}\n");
    const subject = await sha256Fingerprint(contentBytes, "FILE");
    const claim: Claim = { id: "", subject, attribution: { identityId: "alice", role: "creator" }, assertedTier: "bound", createdAt: "2026-02-02T00:00:00Z" };
    const sig = await signClaim(claim, keys, { carrierId: "git-notes", signedAt: "2026-02-02T00:00:00Z" });

    // Same signature, two different carriers — both verify (signature covers the payload, not the framing).
    for (const carrierId of ["git-notes", "spdx"] as const) {
      const env = CARRIER_REGISTRY.get(carrierId)!.serialize(claim, { ...sig, carrierId });
      const r = await verifyAttestation(env, { content: contentBytes, trustSigner: true });
      expect(r.confirmedTier, carrierId).toBe("bound");
      expect(r.signatureValid, carrierId).toBe(true);
    }
  });

  it("wrong content fails the byte-binding and degrades to verified", async () => {
    const keys = await generateSigningKeyPair();
    const realBytes = new TextEncoder().encode("real content\n");
    const subject = await sha256Fingerprint(realBytes, "FILE");
    const claim: Claim = { id: "", subject, attribution: { identityId: "alice", role: "creator" }, assertedTier: "bound", createdAt: "2026-02-02T00:00:00Z" };
    const sig = await signClaim(claim, keys, { carrierId: "in-toto", signedAt: "2026-02-02T00:00:00Z" });
    const env = CARRIER_REGISTRY.get("in-toto")!.serialize(claim, sig);

    const r = await verifyAttestation(env, { content: new TextEncoder().encode("DIFFERENT content\n"), trustSigner: true });
    expect(r.signatureValid).toBe(true); // the signature itself is fine...
    expect(r.contentMatches).toBe(false); // ...but the bytes don't match the subject
    expect(r.confirmedTier).toBe("verified"); // so 'bound' is not granted
  });

  it("verifyClaimSignature returns false on a forged signature rather than throwing", async () => {
    const keys = await generateSigningKeyPair();
    const subject = await sha256Fingerprint(new TextEncoder().encode("x"), "FILE");
    const claim: Claim = { id: "", subject, attribution: { identityId: "a", role: "creator" }, assertedTier: "verified", createdAt: "2026-01-01T00:00:00Z" };
    const bad = { signerKeyId: keys.publicKeyHex, value: "deadbeef", carrierId: "in-toto", signedAt: "2026-01-01T00:00:00Z" };
    expect(await verifyClaimSignature(claim, bad)).toBe(false);
  });
});
