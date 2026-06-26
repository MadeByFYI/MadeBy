/**
 * The honest trust ladder (STRATEGY.md §2, ARCHITECTURE.md), ordered ascending.
 * - asserted : a claim, from anyone. Discovery/credit only.
 * - sworn    : no crypto binding, but legally consequential.
 * - verified : the signer is a known, verified party.
 * - bound    : cryptographic binding to the exact bytes.
 */
export const TRUST_TIERS = ["asserted", "sworn", "verified", "bound"] as const;

export type TrustTier = (typeof TRUST_TIERS)[number];

const RANK: Record<TrustTier, number> = {
  asserted: 0,
  sworn: 1,
  verified: 2,
  bound: 3,
};

/** Compare two tiers. > 0 if `a` outranks `b`, < 0 if `b` outranks `a`, 0 if equal. */
export function compareTiers(a: TrustTier, b: TrustTier): number {
  return RANK[a] - RANK[b];
}

/**
 * INVARIANT (TESTING.md §2): the system fails safe. Anything unrecognized,
 * unverifiable, or degraded must cap at `asserted` — never escalate upward.
 */
export const FALLBACK_TIER: TrustTier = "asserted";
