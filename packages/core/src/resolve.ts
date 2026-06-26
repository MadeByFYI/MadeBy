// Effective trust-tier resolution — the single most trust-critical function in the system.
// INVARIANTS (TESTING.md §2): fail safe. Unknown carrier or unverifiable signature caps at
// 'asserted'; the result never escalates above what the evidence supports.

import { FALLBACK_TIER } from "./tiers";
import type { TrustTier } from "./tiers";
import type { Claim, Carrier, Signature } from "./model";
import { isExactFingerprint } from "./fingerprint";

export interface ResolutionContext {
  /** carriers we recognize, keyed by id */
  knownCarriers: ReadonlyMap<string, Carrier>;
  /** verify a signature over the canonical claim payload; true iff cryptographically valid */
  verifySignature: (claim: Claim, sig: Signature) => boolean;
  /** whether the signer's identity is verified (required for 'verified'/'bound') */
  isSignerVerified: (sig: Signature) => boolean;
}

/**
 * Resolve the EFFECTIVE tier of a claim. Degrades downward, never upward:
 * - asserted : always (the floor)
 * - sworn    : iff a sworn attestation exists (legal consequence, no crypto)
 * - verified : valid signature in a recognized carrier + verified signer
 * - bound    : everything 'verified' requires + an exact-byte fingerprint
 *              (a fuzzy/structural fingerprint can't be byte-bound → degrades to 'verified')
 */
export function resolveTier(claim: Claim, ctx: ResolutionContext): TrustTier {
  const wants = claim.assertedTier;

  if (wants === "asserted") return "asserted";
  if (wants === "sworn") return claim.sworn ? "sworn" : FALLBACK_TIER;

  // verified / bound require cryptographic evidence.
  const sig = claim.signature;
  if (!sig) return FALLBACK_TIER;

  const carrier = ctx.knownCarriers.get(sig.carrierId);
  if (!carrier || !carrier.verificationCapable) return FALLBACK_TIER; // unknown carrier → cap
  if (!ctx.verifySignature(claim, sig)) return FALLBACK_TIER; // bad signature → cap
  if (!ctx.isSignerVerified(sig)) return FALLBACK_TIER; // anonymous signer → cap

  if (wants === "verified") return "verified";

  // wants === "bound": needs exact-byte binding; otherwise the evidence only supports 'verified'.
  return isExactFingerprint(claim.subject) ? "bound" : "verified";
}
