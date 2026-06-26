/**
 * Canonicalization — the deterministic byte form of a claim that a signature
 * covers, independent of carrier (ARCHITECTURE.md §3).
 *
 * INVARIANT: the content hash inside a claim is treated as an opaque string;
 * canonicalization never touches the content bytes themselves (two-hash rule).
 *
 * Implemented in #9 (attestation standard). Conformance vectors: #17.
 */
export function canonicalize(_claim: unknown): Uint8Array {
  throw new Error("not implemented — see issue #9 (attestation standard)");
}
