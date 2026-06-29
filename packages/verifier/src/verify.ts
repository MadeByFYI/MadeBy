// Standalone reference verifier — the runnable form of "don't trust us, verify" (TESTING.md §4).
// Given a carrier envelope (and optionally the original content + a public key you trust), it
// confirms, OFFLINE, the cryptographic facts behind a bound-tier claim and reports the highest
// tier it can independently confirm. It reuses @madeby/core (the OPEN spec/boundary) for parsing,
// canonicalization, and tier policy — so this exercises the same logic prod ships — and adds the
// one check resolveTier structurally cannot do without the bytes: re-hashing the content to
// confirm the byte-binding required for `bound`.
//
// What it CANNOT do alone: decide whether a key belongs to a verified identity. You supply the
// key you trust (or vouch for the embedded one via trustSigner); identity binding is the one step
// that needs MadeBy's registry or your own out-of-band trust. Absent that, it fails safe to asserted.

import {
  canonicalize,
  parseEnvelope,
  resolveTier,
  carriersForResolution,
  isExactFingerprint,
  isNativeFingerprint,
  gitBlobFingerprint,
  sha256Fingerprint,
  type Claim,
  type Signature,
  type Fingerprint,
  type TrustTier,
  type Json,
} from "@madeby/core";
import { SUITE_ALG, hexToBytes, importPublicKey } from "./suite";

/** Verify a single signature over a claim's canonical payload. Fails safe: any error ⇒ false. */
export async function verifyClaimSignature(
  claim: Claim,
  sig: Signature,
  publicKeyHex: string = sig.signerKeyId,
): Promise<boolean> {
  try {
    const key = await importPublicKey(publicKeyHex);
    const payload = Uint8Array.from(canonicalize(claim));
    return await crypto.subtle.verify(SUITE_ALG, key, Uint8Array.from(hexToBytes(sig.value)), payload);
  } catch {
    return false;
  }
}

/** Recompute the matching exact fingerprint of `content` for an algorithm, or null if unsupported. */
async function recomputeFingerprint(algorithm: string, target: string, content: Uint8Array): Promise<Fingerprint | null> {
  switch (algorithm) {
    case "git-blob-sha1":
      return gitBlobFingerprint(content, target);
    case "sha256":
      return sha256Fingerprint(content, target);
    default:
      return null; // other exact algs verify with generic tools; this reference helper covers the defaults
  }
}

export interface VerifyOptions {
  /** the public key you independently trust; defaults to the key embedded in the signature */
  publicKeyHex?: string;
  /** the original content bytes — supply them to confirm the byte-binding required for `bound` */
  content?: Uint8Array;
  /** you vouch that the signing key belongs to a verified identity (required to reach verified/bound) */
  trustSigner?: boolean;
}

export interface VerificationResult {
  /** false ⇒ unrecognized carrier ⇒ capped at asserted (TESTING.md §3) */
  recognizedCarrier: boolean;
  signaturePresent: boolean;
  signatureValid: boolean;
  /** invariant #1: subject references a native content hash, not a MadeBy envelope re-hash */
  subjectIsNative: boolean;
  /** subject is an exact byte-level hash (a precondition for `bound`) */
  subjectIsExact: boolean;
  /** was content supplied AND re-hashable by this verifier? */
  contentChecked: boolean;
  /** recomputed fingerprint matched the subject (null when not checked) */
  contentMatches: boolean | null;
  /** the highest tier THIS evidence + these tools independently confirm */
  confirmedTier: TrustTier;
  /** human-readable account of every downgrade/decision */
  reasons: string[];
}

/**
 * Independently verify a carrier envelope and report the highest tier it confirms. Mirrors the
 * production fail-safe ladder: unrecognized carrier / invalid signature / un-vouched signer all
 * cap at `asserted`; `verified` needs a valid signature in a recognized carrier from a vouched
 * key; `bound` additionally needs an exact-hash subject AND the supplied content to re-hash to it.
 */
export async function verifyAttestation(
  envelope: Record<string, Json>,
  opts: VerifyOptions = {},
): Promise<VerificationResult> {
  const reasons: string[] = [];
  const fail = (reason: string): VerificationResult => {
    reasons.push(reason);
    return {
      recognizedCarrier: false,
      signaturePresent: false,
      signatureValid: false,
      subjectIsNative: false,
      subjectIsExact: false,
      contentChecked: false,
      contentMatches: null,
      confirmedTier: "asserted",
      reasons,
    };
  };

  const parsed = parseEnvelope(envelope);
  if (!parsed) return fail("envelope did not parse into a recognizable claim payload → asserted");

  const { claim, signature } = parsed;
  const recognizedCarrier = parsed.recognized;
  if (!recognizedCarrier) reasons.push(`carrier "${parsed.carrierId}" is not recognized → capped at asserted`);

  const subjectIsNative = isNativeFingerprint(claim.subject);
  if (!subjectIsNative) reasons.push("subject is not a native content hash (two-hash invariant) → asserted");

  const subjectIsExact = isExactFingerprint(claim.subject);

  const signaturePresent = signature !== undefined;
  let signatureValid = false;
  if (signaturePresent) {
    signatureValid = await verifyClaimSignature(claim, signature, opts.publicKeyHex);
    reasons.push(signatureValid ? "signature is cryptographically valid over the canonical payload" : "signature did NOT verify → asserted");
  } else {
    reasons.push("no signature present → cannot exceed asserted (or sworn)");
  }

  // Content byte-binding check (the part resolveTier can't do offline).
  let contentChecked = false;
  let contentMatches: boolean | null = null;
  if (opts.content && subjectIsExact) {
    const recomputed = await recomputeFingerprint(claim.subject.algorithm, claim.subject.target, opts.content);
    if (recomputed) {
      contentChecked = true;
      contentMatches = recomputed.value === claim.subject.value;
      reasons.push(contentMatches ? `content re-hashes to the subject ${claim.subject.algorithm} → byte-binding confirmed` : "content does NOT re-hash to the subject → byte-binding FAILED");
    } else {
      reasons.push(`no reference re-hash for "${claim.subject.algorithm}"; confirm byte-binding with generic tools (see VERIFYING.md)`);
    }
  }

  const trustSigner = opts.trustSigner ?? false;
  if (signatureValid && !trustSigner) {
    reasons.push("signing key not vouched for (pass trustSigner / a trusted publicKeyHex) → identity not established, capped at asserted");
  }

  // Reuse the production tier ladder. Ask for the ceiling ('bound') and let it degrade.
  let confirmedTier: TrustTier = "asserted";
  if (subjectIsNative) {
    confirmedTier = resolveTier(
      { ...claim, assertedTier: "bound", signature },
      {
        knownCarriers: carriersForResolution(),
        verifySignature: () => signatureValid,
        isSignerVerified: () => trustSigner,
      },
    );
  }

  // resolveTier grants 'bound' on an exact-hash subject WITHOUT seeing content. We only confirm
  // 'bound' if the content actually re-hashed to the subject; otherwise the proof is 'verified'.
  if (confirmedTier === "bound" && contentMatches !== true) {
    confirmedTier = "verified";
    reasons.push("subject is an exact hash but content was not supplied/matched to confirm the byte-binding → confirmed 'verified', not 'bound'");
  }

  return {
    recognizedCarrier,
    signaturePresent,
    signatureValid,
    subjectIsNative,
    subjectIsExact,
    contentChecked,
    contentMatches,
    confirmedTier,
    reasons,
  };
}
