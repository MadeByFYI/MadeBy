// The bound-tier signature suite (ARCHITECTURE.md §7; invariant #2). v0 = Ed25519 over the
// RFC 8785 (JCS) canonical claim payload produced by @madeby/core's canonicalize().
//
// Why Ed25519/JCS:
//  - It is a STANDARD primitive present in every mainstream stack — Web Crypto, Node, Python
//    `cryptography`, Go crypto/ed25519, OpenSSL 3, and Sigstore — so a third party can verify
//    with their own tools, no MadeBy code required (the whole point of TESTING.md §4).
//  - It is DETERMINISTIC: the same key + payload yield byte-identical signatures, so published
//    verification vectors are exactly reproducible (ECDSA's per-signature nonce would not be).
//
// A signature covers ONLY the canonical claim payload (no carrier framing), so it survives
// re-encoding between carriers (carrier-independence, invariant #2). Adding ECDSA-P256/cosign
// interop later is a NEW suite id registered alongside this one — it never changes this contract.

export const SIGNATURE_SUITE_V0 = "ed25519-jcs-v0";

/** Web Crypto algorithm identifier for the v0 suite. */
export const SUITE_ALG = { name: "Ed25519" } as const;

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, "0");
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("hexToBytes: odd-length hex string");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("hexToBytes: invalid hex");
    out[i] = byte;
  }
  return out;
}

/** Import a raw (32-byte) Ed25519 public key from hex for signature verification. */
export function importPublicKey(publicKeyHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", Uint8Array.from(hexToBytes(publicKeyHex)), SUITE_ALG, true, ["verify"]);
}

/** Import a PKCS#8 Ed25519 private key from hex for signing (reference signer only). */
export function importPrivateKey(privateKeyPkcs8Hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", Uint8Array.from(hexToBytes(privateKeyPkcs8Hex)), SUITE_ALG, false, ["sign"]);
}
