// @madeby/core — shared deterministic trust logic.
// This package is the publishable / open boundary (TESTING.md §4): the spec,
// conformance vectors, and a verification path live here; the rest of the repo stays closed.

export { TRUST_TIERS, compareTiers, FALLBACK_TIER } from "./tiers";
export type { TrustTier } from "./tiers";

export { canonicalize, claimPayload, claimFromPayload, jcs, edgePayload, canonicalizeEdge } from "./canonicalize";
export type { Json } from "./canonicalize";

export {
  CARRIER_REGISTRY,
  carriersForResolution,
  parseEnvelope,
} from "./carriers";
export type { CarrierBinding, ParsedAttestation } from "./carriers";

export {
  EDGE_TYPES,
  EDGE_TIER_CAP,
  isRecognizedEdgeType,
  knownEdgeTypesForResolution,
  resolveEdgeTier,
} from "./edges";
export type { EdgeCategory, EdgeTypeDef, EdgeResolutionContext } from "./edges";

export type { SpanAnchor, SpanAttribution, SpanAttestationV0 } from "./span";

export {
  SPAN_MANIFEST_VERSION,
  spanManifestPath,
  spanManifestPayload,
  canonicalizeSpanManifest,
  serializeSpanManifest,
  parseSpanManifest,
} from "./manifest";
export type { SpanManifest } from "./manifest";

export {
  sha256Fingerprint,
  gitBlobFingerprint,
  exactFingerprints,
  isExactFingerprint,
  isNativeFingerprint,
} from "./fingerprint";
export type { Fingerprint } from "./fingerprint";

export { structuralFingerprint, cosineSimilarity, normalizeSource } from "./structural";
export type { StructuralResult } from "./structural";

export { resolveTier } from "./resolve";
export type { ResolutionContext } from "./resolve";

export { resolveClaims, resolve } from "./resolution";
export type { ResolvedClaim, Resolution } from "./resolution";

export { resolveContention } from "./contention";
export type { Contention, ClaimStanding, OriginationEvidence, OriginationInput } from "./contention";

export { runConformance, CONFORMANCE_VERSION } from "./conformance";
export type { ConformanceResult } from "./conformance";

export { runRedTeam } from "./redteam";
export type { AttackResult } from "./redteam";

export { assertSubjectIsReference } from "./guards";

export { computeCoverage, percentByTier } from "./coverage";
export type { CoverageView } from "./coverage";

export type {
  Identity,
  IdentityType,
  Anchor,
  AnchorKind,
  VerificationStatus,
  Subject,
  Attribution,
  ContributorRole,
  Signature,
  SwornAttestation,
  Claim,
  ClaimEdge,
  EdgeType,
  EdgeMethod,
  Carrier,
} from "./model";
