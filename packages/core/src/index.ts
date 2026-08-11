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

export { generateFingerprintKey, privateFingerprint, isPrivateFingerprint } from "./private-fingerprint";

export { structuralFingerprint, cosineSimilarity, normalizeSource } from "./structural";
export type { StructuralResult } from "./structural";

export { resolveTier } from "./resolve";
export type { ResolutionContext } from "./resolve";

export {
  DECLARATION_TEMPLATES,
  MADEBY_ATTESTATION_V1_OPERATIVE,
  canonicalizeOperative,
  operativeHash,
  detectDeclaration,
  declarationTier,
  recognizesSwornRepresentation,
  swornAttestationFrom,
} from "./declaration";
export type { DeclarationTemplate, TemplateStatus, DeclarationDetection } from "./declaration";

export { resolveClaims, resolve } from "./resolution";
export type { ResolvedClaim, Resolution } from "./resolution";

export { resolveContention } from "./contention";
export type { Contention, ClaimStanding, OriginationEvidence, OriginationInput } from "./contention";
// Free-tier social/economic abuse controls (#72): bound adjudication-by-display, flag corpus-poisoning.
export { boundClaimStandings, detectCorpusPoisoning } from "./abuse";
export type { BoundedClaims, PoisonFlag } from "./abuse";

export { runConformance, CONFORMANCE_VERSION } from "./conformance";
export type { ConformanceResult } from "./conformance";

export { runRedTeam } from "./redteam";
export type { AttackResult } from "./redteam";

export { assertSubjectIsReference } from "./guards";

export { computeCoverage, percentByTier } from "./coverage";
export type { CoverageView } from "./coverage";

export {
  DISCLOSURE_KINDS,
  recognizeDcoSignoffs,
  hasDcoSignoff,
  recognizeAiTrailers,
  hasAiTrailer,
  recognizeSpdxIdentifiers,
  disclosureKindsPresent,
  commitDisclosureKinds,
} from "./disclosure";
export type {
  DisclosureKind,
  DisclosureKindMeta,
  DisclosureNativeness,
  ParserStatus,
  DisclosureSignal,
} from "./disclosure";

export {
  DEFAULT_POLICY,
  parseDisclosurePolicy,
  evaluateDisclosurePolicy,
} from "./policy";
export type {
  DisclosurePolicy,
  PolicyMode,
  CommitDisclosure,
  CommitVerdict,
  PolicyEvaluation,
} from "./policy";

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
