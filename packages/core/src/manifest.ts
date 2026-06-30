// v0 span manifest — the on-disk carrier for span attestations (ARCHITECTURE.md §3/§4; dogfood #2).
//
// A manifest is the `.madeby/` sidecar (or, later, a git-notes ref — carrier-independent) that
// records the SpanAttestationV0[] captured for ONE commit. It is content-anchored (each span
// carries its own fingerprint) and operator-signable: the signature covers the canonical payload,
// independent of where the manifest is stored — the same two-hash + canonical-signing discipline
// as claims (§3). Storing it out-of-band keeps commit content hashes untouched.

import { jcs, type Json } from "./canonicalize";
import type { SpanAttestationV0 } from "./span";
import type { Signature } from "./model";

export const SPAN_MANIFEST_VERSION = "0";

export interface SpanManifest {
  version: string;
  /** the git commit SHA these spans were captured for */
  commit: string;
  /** RFC 3339 capture time */
  generatedAt: string;
  attestations: SpanAttestationV0[];
  /** operator signature over canonicalizeSpanManifest() — optional until signing is set up */
  signature?: Signature;
}

/** Where a commit's span manifest lives (the `.madeby/` sidecar carrier). */
export function spanManifestPath(commit: string): string {
  return `.madeby/spans/${commit}.json`;
}

function attestationToJson(a: SpanAttestationV0): Json {
  const fp = a.anchor.fingerprint;
  const anchor: Record<string, Json> = {
    fingerprint: { algorithm: fp.algorithm, target: fp.target, value: fp.value },
  };
  if (a.anchor.hint) {
    const hint: Record<string, Json> = { path: a.anchor.hint.path };
    if (a.anchor.hint.startLine !== undefined) hint.startLine = a.anchor.hint.startLine;
    if (a.anchor.hint.endLine !== undefined) hint.endLine = a.anchor.hint.endLine;
    anchor.hint = hint;
  }
  const at = a.attribution;
  const attribution: Record<string, Json> = {
    provider: at.provider,
    model: at.model,
    operatorId: at.operatorId,
    source: at.source,
  };
  if (at.modelVersion !== undefined) attribution.modelVersion = at.modelVersion;
  return { anchor, attribution };
}

/** The signable payload of a manifest — excludes the signature it covers. */
export function spanManifestPayload(m: SpanManifest): Json {
  return {
    version: m.version,
    commit: m.commit,
    generatedAt: m.generatedAt,
    attestations: m.attestations.map(attestationToJson),
  };
}

/** The canonical bytes an operator signature covers. */
export function canonicalizeSpanManifest(m: SpanManifest): Uint8Array {
  return new TextEncoder().encode(jcs(spanManifestPayload(m)));
}

/** Pretty, stable on-disk form (human-legible; includes the signature when present). */
export function serializeSpanManifest(m: SpanManifest): string {
  return JSON.stringify(m, null, 2) + "\n";
}

interface RawManifest {
  version?: unknown;
  commit?: unknown;
  generatedAt?: unknown;
  attestations?: unknown;
  signature?: unknown;
}

/** Parse + validate a manifest; throws on a malformed one (fail safe — never half-trust). */
export function parseSpanManifest(text: string): SpanManifest {
  const raw = JSON.parse(text) as RawManifest;
  if (typeof raw.version !== "string") throw new Error("span manifest: missing version");
  if (typeof raw.commit !== "string" || raw.commit.length === 0) throw new Error("span manifest: missing commit");
  if (typeof raw.generatedAt !== "string") throw new Error("span manifest: missing generatedAt");
  if (!Array.isArray(raw.attestations)) throw new Error("span manifest: attestations must be an array");

  const attestations: SpanAttestationV0[] = raw.attestations.map((a, i) => {
    const o = a as { anchor?: { fingerprint?: Record<string, unknown>; hint?: Record<string, unknown> }; attribution?: Record<string, unknown> };
    const fp = o.anchor?.fingerprint;
    const at = o.attribution;
    if (!fp || typeof fp.algorithm !== "string" || typeof fp.target !== "string" || typeof fp.value !== "string") {
      throw new Error(`span manifest: attestation ${i} has a malformed fingerprint`);
    }
    if (!at || typeof at.provider !== "string" || typeof at.model !== "string" || typeof at.operatorId !== "string" || typeof at.source !== "string") {
      throw new Error(`span manifest: attestation ${i} has a malformed attribution`);
    }
    const anchor = {
      fingerprint: { algorithm: fp.algorithm, target: fp.target, value: fp.value },
      ...(o.anchor?.hint && typeof o.anchor.hint.path === "string"
        ? {
            hint: {
              path: o.anchor.hint.path,
              ...(typeof o.anchor.hint.startLine === "number" ? { startLine: o.anchor.hint.startLine } : {}),
              ...(typeof o.anchor.hint.endLine === "number" ? { endLine: o.anchor.hint.endLine } : {}),
            },
          }
        : {}),
    };
    const attribution = {
      provider: at.provider,
      model: at.model,
      operatorId: at.operatorId,
      source: at.source,
      ...(typeof at.modelVersion === "string" ? { modelVersion: at.modelVersion } : {}),
    };
    return { anchor, attribution };
  });

  return {
    version: raw.version,
    commit: raw.commit,
    generatedAt: raw.generatedAt,
    attestations,
    ...(raw.signature ? { signature: raw.signature as Signature } : {}),
  };
}
