// Provenance coverage — a COMPUTED view, never stored ground truth (invariant #4), always a
// labeled estimate carrying its tier distribution (invariant #6).

import { TRUST_TIERS } from "./tiers";
import type { TrustTier } from "./tiers";
import type { Claim } from "./model";
import { resolveTier, type ResolutionContext } from "./resolve";

export interface CoverageView {
  /** always true — a coverage view is an estimate, never asserted as truth */
  readonly isEstimate: true;
  readonly methodology: string;
  readonly total: number;
  readonly attributed: number;
  readonly unattributed: number;
  readonly tierDistribution: Readonly<Record<TrustTier, number>>;
}

/**
 * Compute a coverage view over a set of claims. Pure: does not mutate or persist anything.
 * Percentages are intentionally NOT returned as stored numbers — derive them at the edge from
 * the distribution via `percentByTier`, labeled as a view.
 */
export function computeCoverage(
  claims: readonly Claim[],
  ctx: ResolutionContext,
  methodology = "effective-tier over attributed units (estimate)",
): CoverageView {
  const tierDistribution: Record<TrustTier, number> = {
    asserted: 0,
    sworn: 0,
    verified: 0,
    bound: 0,
  };
  let attributed = 0;

  for (const claim of claims) {
    tierDistribution[resolveTier(claim, ctx)] += 1;
    if (claim.attribution.identityId) attributed += 1;
  }

  return {
    isEstimate: true,
    methodology,
    total: claims.length,
    attributed,
    unattributed: claims.length - attributed,
    tierDistribution,
  };
}

/** Edge-only helper: percentages are a *view* derived from a coverage view, not ground truth. */
export function percentByTier(view: CoverageView): Record<TrustTier, number> {
  const out = {} as Record<TrustTier, number>;
  for (const tier of TRUST_TIERS) {
    out[tier] = view.total === 0 ? 0 : (view.tierDistribution[tier] / view.total) * 100;
  }
  return out;
}
