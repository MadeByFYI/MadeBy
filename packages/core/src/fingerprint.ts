/**
 * Multi-resolution fingerprinting — the join key for the resolver (ARCHITECTURE.md §2).
 * Exact layer (git SHAs / sha256) for tamper-evidence; structural/fuzzy layer for
 * derivation and "substantially the same" matching.
 *
 * INVARIANT: a fingerprint is content identity, never the claim/signature hash.
 *
 * Computation is implemented in #11; the types + classification helpers below are used by
 * the data model and tier resolution now.
 */
export type Fingerprint = {
  /** e.g. "git-blob-sha1", "sha256", "structural-v1" */
  algorithm: string;
  /** what was hashed, e.g. "FILE", "COMMIT", "TEXT" */
  target: string;
  /** hex-encoded value */
  value: string;
};

/** Exact, byte-level content hashes (support the 'bound' tier). */
const EXACT_ALGORITHMS = new Set([
  "git-blob-sha1",
  "git-tree-sha1",
  "git-commit-sha1",
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "sha3-512",
  "blake3",
]);

/** Reserved internal namespaces a subject fingerprint must NOT use (invariant #1). */
const RESERVED_PREFIXES = ["madeby-", "claim-", "envelope-"];

/** True for exact byte-level fingerprints (eligible for the 'bound' tier). */
export function isExactFingerprint(fp: Fingerprint): boolean {
  return EXACT_ALGORITHMS.has(fp.algorithm);
}

/**
 * True iff the fingerprint references a native/external content hash — not a MadeBy-internal
 * envelope hash. Enforces the two-hash invariant at the subject boundary.
 */
export function isNativeFingerprint(fp: Fingerprint): boolean {
  const algo = fp.algorithm.toLowerCase();
  if (RESERVED_PREFIXES.some((p) => algo.startsWith(p))) return false;
  return algo.length > 0 && fp.value.length > 0;
}

export function fingerprintExact(_bytes: Uint8Array): Fingerprint {
  throw new Error("not implemented — see issue #11 (fingerprinting)");
}
