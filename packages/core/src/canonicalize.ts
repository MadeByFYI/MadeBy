// Canonicalization — the deterministic byte form of a claim that a signature covers,
// independent of carrier (ARCHITECTURE.md §3, invariant #2). RFC 8785 (JCS)-aligned.
//
// INVARIANT (two-hash rule): the content hash inside a claim is treated as an opaque string;
// canonicalization never touches content bytes. Conformance vectors pinned in #17.

import type { Claim } from "./model";

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** RFC 8785-aligned JSON Canonicalization Scheme for the value subset we emit. */
export function jcs(value: Json): string {
  return serialize(value);
}

function serialize(v: Json): string {
  if (v === null) return "null";
  switch (typeof v) {
    case "boolean":
      return v ? "true" : "false";
    case "number":
      return serializeNumber(v);
    case "string":
      // JSON.stringify produces JCS-conformant string escaping for the BMP.
      return JSON.stringify(v);
    case "object": {
      if (Array.isArray(v)) return "[" + v.map(serialize).join(",") + "]";
      // JCS sorts member keys by UTF-16 code unit — JS string sort default matches.
      const keys = Object.keys(v).sort();
      return "{" + keys.map((k) => JSON.stringify(k) + ":" + serialize(v[k] as Json)).join(",") + "}";
    }
    default:
      throw new Error(`canonicalize: unsupported value type ${typeof v}`);
  }
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) throw new Error("canonicalize: non-finite numbers are not allowed");
  // v0 restricts numbers to integers; use strings for decimals/timestamps to stay deterministic
  // across implementations until full JCS number formatting + vectors land in #17.
  if (!Number.isInteger(n)) {
    throw new Error("canonicalize: v0 allows integer numbers only (use strings for decimals)");
  }
  return String(n);
}

/** Drop undefined-valued keys so optional fields don't affect the canonical bytes. */
function compact(obj: Record<string, Json | undefined>): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val !== undefined) out[k] = val;
  }
  return out;
}

/**
 * The carrier-independent, signable payload of a claim. Excludes the claim `id`
 * (content-addressed, derived from these bytes) and the `signature` (which covers them).
 */
export function claimPayload(claim: Claim): Json {
  return compact({
    subject: {
      algorithm: claim.subject.algorithm,
      target: claim.subject.target,
      value: claim.subject.value,
    },
    attribution: compact({
      identityId: claim.attribution.identityId,
      role: claim.attribution.role,
      aiProvider: claim.attribution.aiProvider,
      aiModel: claim.attribution.aiModel,
      operatorId: claim.attribution.operatorId,
    }),
    assertedTier: claim.assertedTier,
    sworn: claim.sworn
      ? {
          representationCode: claim.sworn.representationCode,
          signatureName: claim.sworn.signatureName,
          signedAt: claim.sworn.signedAt,
        }
      : undefined,
    createdAt: claim.createdAt,
  });
}

interface RawPayload {
  subject: { algorithm: string; target: string; value: string };
  attribution: { identityId: string; role: string; aiProvider?: string; aiModel?: string; operatorId?: string };
  assertedTier: string;
  sworn?: { representationCode: string; signatureName: string; signedAt: string };
  createdAt: string;
}

/** Reconstruct a Claim from a canonical payload (inverse of claimPayload). */
export function claimFromPayload(payload: Json): Claim {
  const p = payload as unknown as RawPayload;
  return {
    id: "",
    subject: { algorithm: p.subject.algorithm, target: p.subject.target, value: p.subject.value },
    attribution: {
      identityId: p.attribution.identityId,
      role: p.attribution.role as Claim["attribution"]["role"],
      ...(p.attribution.aiProvider ? { aiProvider: p.attribution.aiProvider } : {}),
      ...(p.attribution.aiModel ? { aiModel: p.attribution.aiModel } : {}),
      ...(p.attribution.operatorId ? { operatorId: p.attribution.operatorId } : {}),
    },
    assertedTier: p.assertedTier as Claim["assertedTier"],
    ...(p.sworn
      ? {
          sworn: {
            representationCode: p.sworn.representationCode,
            signatureName: p.sworn.signatureName,
            signedAt: p.sworn.signedAt,
          },
        }
      : {}),
    createdAt: p.createdAt,
  };
}

/** The canonical bytes a signature covers. */
export function canonicalize(claim: Claim): Uint8Array {
  return new TextEncoder().encode(jcs(claimPayload(claim)));
}
