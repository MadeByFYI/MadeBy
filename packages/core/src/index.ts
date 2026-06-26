// @madeby/core — shared deterministic trust logic.
// This package is the publishable / open boundary (TESTING.md §4): the spec,
// conformance vectors, and a verification path live here; the rest of the repo stays closed.

export { TRUST_TIERS, compareTiers, FALLBACK_TIER } from "./tiers";
export type { TrustTier } from "./tiers";

export { canonicalize } from "./canonicalize";

export { fingerprintExact } from "./fingerprint";
export type { Fingerprint } from "./fingerprint";
