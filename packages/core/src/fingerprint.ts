/**
 * Multi-resolution fingerprinting — the join key for the resolver (ARCHITECTURE.md §2).
 * Exact layer (git SHAs / sha256) for tamper-evidence; structural/fuzzy layer (structural.ts)
 * for derivation and "substantially the same" matching.
 *
 * INVARIANT: a fingerprint is content identity, never the claim/signature hash.
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

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, "0");
  return out;
}

/** Raw SHA-256 of the content bytes. */
export async function sha256Fingerprint(bytes: Uint8Array, target = "FILE"): Promise<Fingerprint> {
  // Uint8Array.from yields an ArrayBuffer-backed view (assignable to BufferSource under TS 5.7).
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return { algorithm: "sha256", target, value: toHex(digest) };
}

/**
 * Git blob object id — sha1("blob <len>\0" + content). Byte-identical to `git hash-object`,
 * so content registered here is findable by the git SHA an asker already has.
 */
export async function gitBlobFingerprint(bytes: Uint8Array, target = "FILE"): Promise<Fingerprint> {
  const header = enc.encode(`blob ${bytes.length}\0`);
  const data = new Uint8Array(header.length + bytes.length);
  data.set(header, 0);
  data.set(bytes, header.length);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return { algorithm: "git-blob-sha1", target, value: toHex(digest) };
}

/**
 * The default set of exact keys for a piece of content (git blob SHA-1 + sha256), so the
 * subject is findable by whatever exact hash an asker happens to hold (ARCHITECTURE.md §2).
 */
export async function exactFingerprints(bytes: Uint8Array, target = "FILE"): Promise<Fingerprint[]> {
  return Promise.all([gitBlobFingerprint(bytes, target), sha256Fingerprint(bytes, target)]);
}
