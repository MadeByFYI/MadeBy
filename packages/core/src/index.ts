// @madeby/core — shared deterministic trust logic.
// This package is the publishable / open boundary (TESTING.md §4): the spec,
// conformance vectors, and a verification path live here; the rest of the repo stays closed.

export { TRUST_TIERS, compareTiers, FALLBACK_TIER } from "./tiers";
export type { TrustTier } from "./tiers";

export { canonicalize, claimPayload, claimFromPayload, jcs } from "./canonicalize";
export type { Json } from "./canonicalize";

export {
  CARRIER_REGISTRY,
  carriersForResolution,
  parseEnvelope,
} from "./carriers";
export type { CarrierBinding, ParsedAttestation } from "./carriers";

export type { SpanAnchor, SpanAttribution, SpanAttestationV0 } from "./span";

export { fingerprintExact, isExactFingerprint, isNativeFingerprint } from "./fingerprint";
export type { Fingerprint } from "./fingerprint";

export { resolveTier } from "./resolve";
export type { ResolutionContext } from "./resolve";

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
  Carrier,
} from "./model";
