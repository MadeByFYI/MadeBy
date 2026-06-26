/**
 * Multi-resolution fingerprinting — the join key for the resolver (ARCHITECTURE.md §2).
 * Exact layer (git SHAs / sha256) for tamper-evidence; structural/fuzzy layer for
 * derivation and "substantially the same" matching.
 *
 * INVARIANT: a fingerprint is content identity, never the claim/signature hash.
 *
 * Implemented in #11 (fingerprinting). Conformance vectors: #17.
 */
export type Fingerprint = {
  /** e.g. "git-blob-sha1", "sha256", "structural-v1" */
  algorithm: string;
  /** what was hashed, e.g. "FILE", "COMMIT", "TEXT" */
  target: string;
  /** hex-encoded value */
  value: string;
};

export function fingerprintExact(_bytes: Uint8Array): Fingerprint {
  throw new Error("not implemented — see issue #11 (fingerprinting)");
}
