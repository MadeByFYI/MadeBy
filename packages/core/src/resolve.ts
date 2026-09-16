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
  /**
   * whether a sworn overlay's representationCode names a recognized, FINALIZED declaration
   * template (the invariant #3 analog for the sworn carrier — see declaration.ts). An unrecognized
   * or still-draft representation caps at asserted, exactly like an unknown carrier.
   */
  recognizesSwornRepresentation: (representationCode: string) => boolean;
}

/**
 * Resolve the EFFECTIVE tier of a claim. Degrades downward, never upward:
 * - asserted : always (the floor)
 * - sworn    : a sworn overlay that (a) names a recognized, FINALIZED declaration template and
 *              (b) carries a legal signature (a signatory name). Legal consequence, no crypto.
 *              Unrecognized/draft template or missing signature → caps at asserted.
 * - verified : valid signature in a recognized carrier + verified signer
 * - bound    : everything 'verified' requires + an exact-byte fingerprint
 *              (a fuzzy/structural fingerprint can't be byte-bound → degrades to 'verified')
 */
export function resolveTier(claim: Claim, ctx: ResolutionContext): TrustTier {
  const wants = claim.assertedTier;

  if (wants === "asserted") return "asserted";
  if (wants === "sworn") {
    const s = claim.sworn;
    if (!s) return FALLBACK_TIER; // no overlay → nothing sworn
    if (!s.signatureName) return FALLBACK_TIER; // no legal signature → not consequential
    if (!ctx.recognizesSwornRepresentation(s.representationCode)) return FALLBACK_TIER; // unknown/draft template → cap
    return "sworn";
  }

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
