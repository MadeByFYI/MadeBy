// Edge-type registry + fail-safe edge-tier resolution (ARCHITECTURE §6). An edge asserts that
// "A relates to B" — it is a claim, so it carries a tier, resolved fail-safe exactly like claims:
// inferred or unsigned edges cap at 'asserted'; only a DECLARED relationship, signed in a
// recognized way by a VERIFIED signer, reaches 'verified'. Edges never reach 'bound' — they relate
// content, they don't byte-bind it (the edge analog of a fuzzy fingerprint capping at 'verified').
//
// The type set is an OPEN registry (like carriers/algorithms), not a fixed enum — extended over
// time; an unrecognized type degrades to 'asserted' (self-describing + graceful degradation).

import { FALLBACK_TIER, type TrustTier } from "./tiers";
import type { ClaimEdge, EdgeType, Signature } from "./model";

export type EdgeCategory = "composition" | "derivation" | "contradiction" | "relation";

export interface EdgeTypeDef {
  id: EdgeType;
  category: EdgeCategory;
  description: string;
}

/**
 * Known edge types. Composition/derivation are code-native; the relation types link code to the
 * management artifacts that shaped it (the non-code frontier, STRATEGY §3); DISPUTES is the
 * contradiction edge (§11). Open registry — extend here, unknown types degrade to 'asserted'.
 */
export const EDGE_TYPES: ReadonlyMap<EdgeType, EdgeTypeDef> = new Map(
  (
    [
      { id: "PART_OF", category: "composition", description: "A is contained in B (span⊂file⊂commit⊂release); attribution rolls up." },
      { id: "DERIVED_FROM", category: "derivation", description: "A is derived from B (fork/refactor/snippet/AI-generated-by-model)." },
      { id: "DISPUTES", category: "contradiction", description: "A contests B's claim (§11) — a counter-claim, ranked like any claim." },
      { id: "IMPLEMENTS", category: "relation", description: "Code A implements artifact B (ticket/spec)." },
      { id: "MOTIVATED_BY", category: "relation", description: "A exists because of artifact B (the why)." },
      { id: "DECIDED_BY", category: "relation", description: "A is governed by decision record B (ADR/RFC)." },
      { id: "DISCUSSED_IN", category: "relation", description: "A was discussed in B (issue/thread)." },
    ] as EdgeTypeDef[]
  ).map((d) => [d.id, d] as const),
);

export function isRecognizedEdgeType(type: EdgeType): boolean {
  return EDGE_TYPES.has(type);
}

/** Default recognized-type set for resolution (unknown types cap at asserted). */
export function knownEdgeTypesForResolution(): ReadonlySet<EdgeType> {
  return new Set(EDGE_TYPES.keys());
}

/** Edges relate content, they don't byte-bind it — so they cap one rung below claims. */
export const EDGE_TIER_CAP: TrustTier = "verified";

export interface EdgeResolutionContext {
  /** recognized edge types; an unrecognized type caps at asserted */
  knownEdgeTypes: ReadonlySet<EdgeType>;
  /** verify a signature over the canonical edge payload; true iff cryptographically valid */
  verifySignature: (edge: ClaimEdge, sig: Signature) => boolean;
  /** whether the signer's identity is verified */
  isSignerVerified: (sig: Signature) => boolean;
}

/**
 * Resolve the EFFECTIVE tier of an edge. Degrades downward, never upward:
 * - unrecognized type          → asserted
 * - inferred (our heuristic)   → asserted
 * - declared, missing/invalid signature → asserted
 * - declared, anonymous (unverified) signer → asserted
 * - declared + valid signature + verified signer + recognized type → verified (the cap)
 */
export function resolveEdgeTier(edge: ClaimEdge, ctx: EdgeResolutionContext): TrustTier {
  if (!ctx.knownEdgeTypes.has(edge.type)) return FALLBACK_TIER; // unknown type → cap
  if (edge.method !== "declared") return FALLBACK_TIER; // inferred heuristic → cap

  const sig = edge.signature;
  if (!sig) return FALLBACK_TIER; // unsigned declaration → cap
  if (!ctx.verifySignature(edge, sig)) return FALLBACK_TIER; // bad signature → cap
  if (!ctx.isSignerVerified(sig)) return FALLBACK_TIER; // anonymous signer → cap

  return EDGE_TIER_CAP; // declared + signed + verified signer → verified (never bound)
}
