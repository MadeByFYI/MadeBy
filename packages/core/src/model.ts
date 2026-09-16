// Domain model (ARCHITECTURE.md §10). Deliberately small; open string fields over rigid
// enums where values churn (providers, models, algorithms, carriers).
//
// NOTE: there is intentionally NO stored "percent authored" / coverage field on Subject or
// Claim — that is a computed view (invariant #4, see coverage.ts).

import type { TrustTier } from "./tiers";
import type { Fingerprint } from "./fingerprint";

export type IdentityType = "individual" | "organization" | "ai";
export type AnchorKind = "email" | "domain" | "phone" | "address" | "key";
export type VerificationStatus = "unverified" | "pending" | "verified";

/** A verifiable identity attribute (email, domain, …, or a public key / wallet). */
export interface Anchor {
  kind: AnchorKind;
  value: string;
  status: VerificationStatus;
}

export interface Identity {
  id: string;
  type: IdentityType;
  anchors: Anchor[];
  // AI identities only — open fields, never a hardcoded model enum:
  provider?: string;
  model?: string;
  modelVersion?: string;
  /** the human/org operator whose key stands behind an AI identity */
  operatorId?: string;
}

/** Content. Found by any of its multi-resolution fingerprints (the resolver's join keys). */
export interface Subject {
  id: string;
  fingerprints: Fingerprint[];
}

export type ContributorRole = "creator" | "assistant" | "editor" | "generator";

export interface Attribution {
  identityId: string;
  role: ContributorRole;
  // for AI contributions — open fields:
  aiProvider?: string;
  aiModel?: string;
  operatorId?: string;
}

export interface Signature {
  /** the key/identity that signed */
  signerKeyId: string;
  /** signature bytes over the canonical claim payload (hex) */
  value: string;
  /** id of the carrier this signature was minted in (registry lookup) */
  carrierId: string;
  signedAt: string;
}

export interface SwornAttestation {
  representationCode: string;
  signatureName: string;
  signedAt: string;
}

export interface Claim {
  id: string;
  /**
   * INVARIANT #1: the subject is a *reference* to a native content fingerprint —
   * never a re-hash of content into a MadeBy envelope. See guards.ts.
   */
  subject: Fingerprint;
  attribution: Attribution;
  /** the tier the claimant *requests*; resolveTier() decides the EFFECTIVE tier. */
  assertedTier: TrustTier;
  signature?: Signature;
  /** optional legal overlay */
  sworn?: SwornAttestation;
  createdAt: string;
}

/** Open edge-type id; recognized values + semantics live in the edge-type registry (edges.ts). */
export type EdgeType = string;

/** How a relationship was established — its evidence class (ARCHITECTURE §6). */
export type EdgeMethod = "declared" | "inferred";

/**
 * A typed link between claims/subjects. An edge is itself a CLAIM about a relationship, so it
 * carries evidence and resolves to an effective tier (resolveEdgeTier) — fail-safe, never stored.
 * Inferred or unsigned edges cap at 'asserted'; edges never reach 'bound' (they relate, not
 * byte-bind — the edge analog of a fuzzy fingerprint capping at 'verified').
 */
export interface ClaimEdge {
  type: EdgeType;
  fromClaimId: string;
  toClaimId: string;
  /** declared by a source (trailer/link) vs. inferred by us (heuristic / semantic match) */
  method: EdgeMethod;
  /** optional signature over the canonical edge payload (enables the 'verified' tier) */
  signature?: Signature;
  /** surfaced evidence, e.g. "Closes #123 trailer" or "winnowing match 0.92" */
  evidence?: string;
}

/** Carrier registry entry — whether we can fully verify signatures in this carrier. */
export interface Carrier {
  id: string;
  /** false ⇒ unknown canonicalization ⇒ claims in it cap at the asserted tier. */
  verificationCapable: boolean;
}
