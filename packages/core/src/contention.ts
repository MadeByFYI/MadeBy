// Contention resolution — rank competing claims about one subject by EVIDENCE, never adjudicate
// (ARCHITECTURE.md §11). The honest core: authentication ≠ origination.
//
//   • authenticity (tier)  — "we verified that X *said* this" (resolveTier).
//   • origination          — "X is established as the *origin*": lineage + native provenance,
//                            with priority as a weak tiebreaker (first-to-register ≠ first-to-create).
//
// These are DISTINCT axes (invariant #10): a valid signature over copied bytes reaches a high tier
// but does NOT establish origin. So we do NOT rank by tier alone — that would crown the impostor.
// A claim leads only if it DOMINATES on the evidence (≥ on both axes, > on one). Genuine trade-offs
// (one claim better-authenticated, another better-originated) are surfaced as OPEN, with the
// divergence flagged — never resolved by fiat, never crowned by priority alone. Squatting-resistance
// falls out: priority is the floor, so an earlier-but-weaker claim never overrides stronger evidence.

import { compareTiers, type TrustTier } from "./tiers";
import { isExactFingerprint } from "./fingerprint";
import { resolveTier, type ResolutionContext } from "./resolve";
import type { Claim } from "./model";

export interface OriginationEvidence {
  /** subject carries native provenance (git/C2PA) — default: an exact content fingerprint */
  nativeProvenance: boolean;
  /** the claim is a derivative per lineage (the DAG); default false (treated as an origin) */
  isDerivative: boolean;
  /** earliest tamper-evident timestamp — a SIGNAL, not proof (first-to-register ≠ first-to-create) */
  priorityAt: string;
}

/** Optional per-claim origination inputs the DAG/ingestion layer supplies; defaults derive from the claim. */
export interface OriginationInput {
  nativeProvenance?: boolean;
  isDerivative?: boolean;
  priorityAt?: string;
}

export interface ClaimStanding {
  claim: Claim;
  /** statement authenticity — "we verified X SAID this" */
  authenticity: TrustTier;
  /** inputs to "X is the ORIGIN" */
  origination: OriginationEvidence;
  /** ordinal strength of origination evidence (lineage + native provenance) */
  originationRank: number;
}

export interface Contention {
  /** every claim, ordered for display: origination desc, then authenticity desc, then priority asc */
  standings: ClaimStanding[];
  /** the sole evidence-dominant claim, or null when the top is contested (never crowned by priority alone) */
  origin: ClaimStanding | null;
  /** true when >1 claim sits on the evidence frontier → genuinely contested, surfaced openly */
  open: boolean;
  /** true when authenticity and origination point at DIFFERENT claims (e.g. a valid signature over
   *  copied bytes) — surfaced, never hidden (invariant #10) */
  authenticationDivergesFromOrigination: boolean;
}

/** origin (not derivative) outweighs native-provenance; range 0..3. */
function rankOf(o: OriginationEvidence): number {
  return (o.isDerivative ? 0 : 2) + (o.nativeProvenance ? 1 : 0);
}

/** A dominates B iff A is ≥ on BOTH evidence axes and strictly > on at least one. */
function dominates(a: ClaimStanding, b: ClaimStanding): boolean {
  const tier = compareTiers(a.authenticity, b.authenticity);
  const orig = a.originationRank - b.originationRank;
  return tier >= 0 && orig >= 0 && (tier > 0 || orig > 0);
}

function cmpPriority(a: ClaimStanding, b: ClaimStanding): number {
  return a.origination.priorityAt.localeCompare(b.origination.priorityAt); // earliest first
}

/**
 * Rank the claims about one subject. Returns the evidence ordering, the dominant origin (or null
 * when contested), whether it is open, and whether authenticity diverges from origination.
 */
export function resolveContention(
  claims: readonly Claim[],
  ctx: ResolutionContext,
  inputs: readonly (OriginationInput | undefined)[] = [],
): Contention {
  const standings: ClaimStanding[] = claims.map((claim, i) => {
    const inp = inputs[i] ?? {};
    const origination: OriginationEvidence = {
      nativeProvenance: inp.nativeProvenance ?? isExactFingerprint(claim.subject),
      isDerivative: inp.isDerivative ?? false,
      priorityAt: inp.priorityAt ?? claim.createdAt,
    };
    return { claim, authenticity: resolveTier(claim, ctx), origination, originationRank: rankOf(origination) };
  });

  // The evidence frontier: claims dominated by no other claim.
  const frontier = standings.filter((s) => !standings.some((o) => o !== s && dominates(o, s)));

  const ordered = [...standings].sort(
    (a, b) => b.originationRank - a.originationRank || compareTiers(b.authenticity, a.authenticity) || cmpPriority(a, b),
  );

  const open = frontier.length > 1;
  const origin = open ? null : frontier[0] ?? null;

  // Divergence: an OPEN frontier whose claims don't all share one (tier, origination) profile.
  // Any two non-dominated claims with *different* profiles must trade off — one better-authenticated,
  // the other better-originated (e.g. a valid signature over copied bytes). That's the signal we
  // surface and never hide (invariant #10); a frontier where everyone is identical is a plain tie.
  let divergence = false;
  if (open) {
    const base = frontier[0]!;
    divergence = !frontier.every(
      (s) => compareTiers(s.authenticity, base.authenticity) === 0 && s.originationRank === base.originationRank,
    );
  }

  return { standings: ordered, origin, open, authenticationDivergesFromOrigination: divergence };
}
