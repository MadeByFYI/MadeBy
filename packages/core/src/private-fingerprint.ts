// Salted/HMAC private fingerprints (ARCHITECTURE.md §2; #70) — permissioned resolution for private
// content. The resolver is keyed on content fingerprints, so "anyone holding the bytes can query"
// — fine for public code, a LEAK for proprietary code: a raw sha256/git-blob key lets anyone with
// a candidate file confirm its presence and learn its provenance (a hash-enumeration attack).
//
// The fix: for private subjects the join key is HMAC-SHA256(owner-key, native-fingerprint), not the
// raw hash. Only holders of the owner's key can derive the lookup key, so:
//   - the stored value reveals nothing about the content and can't be reversed to the native hash;
//   - an attacker with the bytes but not the key cannot reproduce the key → cannot enumerate/confirm;
//   - authorized askers (with the key) recompute the same value → provenance still resolves.
// We ride the native hash (two-hash invariant intact) and blind it; this is not a re-hash into a
// MadeBy envelope. Permissioned resolution wiring (who gets the key) rides the live registry.

import type { Fingerprint } from "./fingerprint";

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const enc = new TextEncoder();
const PRIVATE_PREFIX = "hmac-sha256:";

/** Generate a fresh 32-byte owner key (hex). Held by the owner + shared only with authorized askers. */
export async function generateFingerprintKey(): Promise<string> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return toHex(raw.buffer);
}

async function hmac(keyHex: string, data: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(fromHex(keyHex)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, Uint8Array.from(data));
  return toHex(sig);
}

/**
 * Blind a native fingerprint into a private, key-scoped lookup key. Same key + same native
 * fingerprint ⇒ same value (so authorized askers match); a different key ⇒ a different value
 * (so the bytes alone never yield the key). The algorithm records what was blinded.
 */
export async function privateFingerprint(nativeFp: Fingerprint, keyHex: string): Promise<Fingerprint> {
  const preimage = enc.encode(`${nativeFp.algorithm}:${nativeFp.target}:${nativeFp.value}`);
  return { algorithm: `${PRIVATE_PREFIX}${nativeFp.algorithm}`, target: nativeFp.target, value: await hmac(keyHex, preimage) };
}

/** True for a private (HMAC-blinded) fingerprint — resolve via permissioned/keyed lookup, not raw. */
export function isPrivateFingerprint(fp: Fingerprint): boolean {
  return fp.algorithm.startsWith(PRIVATE_PREFIX);
}
