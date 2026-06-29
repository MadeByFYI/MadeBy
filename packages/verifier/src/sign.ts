// Reference signer for the v0 bound-tier suite. This is the OPEN generator of the open signature
// suite — security rests on key custody, never on algorithm secrecy (the same posture as Sigstore
// and PGP). Production signing uses managed/HSM-held keys; what stays closed is the ingestion and
// classification pipeline (TESTING.md §4), not this primitive. Exported so anyone can mint their
// own attestations and reproduce the published vectors.

import { canonicalize, type Claim, type Signature } from "@madeby/core";
import { SUITE_ALG, bytesToHex, importPrivateKey } from "./suite";

export interface SigningKeyPair {
  /** raw 32-byte Ed25519 public key, hex — also used as the signature's signerKeyId */
  publicKeyHex: string;
  /** PKCS#8 Ed25519 private key, hex. TEST/REFERENCE USE — never ship a real key in the clear. */
  privateKeyPkcs8Hex: string;
}

/** Generate a fresh Ed25519 keypair for the v0 suite. */
export async function generateSigningKeyPair(): Promise<SigningKeyPair> {
  const kp = (await crypto.subtle.generateKey(SUITE_ALG, true, ["sign", "verify"])) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const priv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  return { publicKeyHex: bytesToHex(pub), privateKeyPkcs8Hex: bytesToHex(priv) };
}

export interface SignOptions {
  /** carrier this signature is minted in (must be in the registry to verify above asserted) */
  carrierId: string;
  /** RFC 3339 timestamp recorded in the signature */
  signedAt: string;
  /** override signerKeyId; defaults to the public key hex so the attestation is self-contained */
  signerKeyId?: string;
}

/**
 * Sign a claim under the v0 suite: Ed25519 over the canonical (JCS) claim payload. The signature
 * is self-contained — signerKeyId carries the public key by default, so a verifier can check the
 * cryptography offline and only needs to confirm that key maps to a trusted identity.
 */
export async function signClaim(
  claim: Claim,
  keys: Pick<SigningKeyPair, "publicKeyHex" | "privateKeyPkcs8Hex">,
  opts: SignOptions,
): Promise<Signature> {
  const key = await importPrivateKey(keys.privateKeyPkcs8Hex);
  const payload = Uint8Array.from(canonicalize(claim));
  const sig = new Uint8Array(await crypto.subtle.sign(SUITE_ALG, key, payload));
  return {
    signerKeyId: opts.signerKeyId ?? keys.publicKeyHex,
    value: bytesToHex(sig),
    carrierId: opts.carrierId,
    signedAt: opts.signedAt,
  };
}
