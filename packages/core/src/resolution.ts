// Resolution policy — given the claims about a subject, ORDER them by evidence; never
// adjudicate truth (ARCHITECTURE.md §1/§2). The asker-pull spine's ranking step.
//
// Order: highest effective tier first, then earliest timestamp (first-to-claim priority).
// `best` is the most-authoritative-by-evidence claim — a ranking, not a verdict. We always
// return the full ordered set so the asker sees all the evidence.

import { compareTiers } from "./tiers";
import type { TrustTier } from "./tiers";
import { resolveTier, type ResolutionContext } from "./resolve";
import type { Claim } from "./model";
import type { Fingerprint } from "./fingerprint";

export interface ResolvedClaim {
  claim: Claim;
  /** the effective (fail-safe) tier — see resolveTier */
  tier: TrustTier;
}

export interface Resolution {
  /** the fingerprint that was queried */
  subject: Fingerprint;
  /** every claim, ordered most-authoritative-by-evidence first */
  claims: ResolvedClaim[];
  /** the top-ranked claim, or null if there are none — a ranking, not a verdict */
  best: ResolvedClaim | null;
}

export function resolveClaims(claims: readonly Claim[], ctx: ResolutionContext): ResolvedClaim[] {
  return claims
    .map((claim) => ({ claim, tier: resolveTier(claim, ctx) }))
    .sort((a, b) => {
      const byTier = compareTiers(b.tier, a.tier); // higher tier first
      if (byTier !== 0) return byTier;
      return a.claim.createdAt.localeCompare(b.claim.createdAt); // earliest first (priority)
    });
}

export function resolve(
  subject: Fingerprint,
  claims: readonly Claim[],
  ctx: ResolutionContext,
): Resolution {
  const ordered = resolveClaims(claims, ctx);
  return { subject, claims: ordered, best: ordered[0] ?? null };
}
