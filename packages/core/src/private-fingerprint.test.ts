import { describe, it, expect } from "vitest";
import { generateFingerprintKey, privateFingerprint, isPrivateFingerprint } from "./private-fingerprint";
import { sha256Fingerprint } from "./fingerprint";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("private (HMAC) fingerprints — permissioned, enumeration-resistant", () => {
  it("same key + same content ⇒ same value (authorized askers match)", async () => {
    const key = await generateFingerprintKey();
    const fp = await sha256Fingerprint(bytes("secret source"));
    const a = await privateFingerprint(fp, key);
    const b = await privateFingerprint(fp, key);
    expect(a.value).toBe(b.value);
    expect(isPrivateFingerprint(a)).toBe(true);
    expect(a.algorithm).toBe("hmac-sha256:sha256");
  });

  it("different key ⇒ different value (the bytes alone never yield the lookup key)", async () => {
    const fp = await sha256Fingerprint(bytes("secret source"));
    const k1 = await generateFingerprintKey();
    const k2 = await generateFingerprintKey();
    expect((await privateFingerprint(fp, k1)).value).not.toBe((await privateFingerprint(fp, k2)).value);
  });

  it("different content, same key ⇒ different value", async () => {
    const key = await generateFingerprintKey();
    const a = await privateFingerprint(await sha256Fingerprint(bytes("file A")), key);
    const b = await privateFingerprint(await sha256Fingerprint(bytes("file B")), key);
    expect(a.value).not.toBe(b.value);
  });

  it("is one-way: the private value is not the native hash (can't reverse to it)", async () => {
    const key = await generateFingerprintKey();
    const nativeFp = await sha256Fingerprint(bytes("secret source"));
    const priv = await privateFingerprint(nativeFp, key);
    expect(priv.value).not.toBe(nativeFp.value);
  });

  it("ENUMERATION RESISTANCE: an attacker with the bytes but no key cannot reproduce the key", async () => {
    // The owner registers the private key; an attacker recomputes the RAW hash of a candidate file
    // (trivial) but that is not what's stored/queried — the stored key is HMAC(ownerKey, hash),
    // which the attacker cannot produce without ownerKey.
    const ownerKey = await generateFingerprintKey();
    const content = bytes("proprietary payments module");
    const stored = await privateFingerprint(await sha256Fingerprint(content), ownerKey);

    const attackerRawHash = await sha256Fingerprint(content); // attacker has the bytes
    const attackerGuessKey = await generateFingerprintKey(); // but not the owner's key
    const attackerAttempt = await privateFingerprint(attackerRawHash, attackerGuessKey);

    expect(attackerAttempt.value).not.toBe(stored.value); // cannot confirm presence
    expect(attackerRawHash.value).not.toBe(stored.value); // the raw hash isn't the join key either
  });

  it("32-byte keys are unique per generation", async () => {
    const a = await generateFingerprintKey();
    const b = await generateFingerprintKey();
    expect(a).toHaveLength(64); // 32 bytes hex
    expect(a).not.toBe(b);
  });
});
