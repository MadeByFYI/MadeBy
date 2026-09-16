// v0 span manifest — the on-disk carrier for span attestations (ARCHITECTURE.md §3/§4; dogfood #2).
//
// A manifest is the `.madeby/` sidecar (or, later, a git-notes ref — carrier-independent) that
// records the SpanAttestationV0[] captured for ONE commit. It is content-anchored (each span
// carries its own fingerprint) and operator-signable: the signature covers the canonical payload,
// independent of where the manifest is stored — the same two-hash + canonical-signing discipline
// as claims (§3). Storing it out-of-band keeps commit content hashes untouched.

import { jcs, type Json } from "./canonicalize";
import type { SpanAttestationV0 } from "./span";
import type { Fingerprint } from "./fingerprint";
import type { Signature } from "./model";

export const SPAN_MANIFEST_VERSION = "0";

/** The self-describing on-disk tag: the first line tells you what the file is. */
const MADEBY_SPANS_TAG = `spans/${SPAN_MANIFEST_VERSION}`;

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

// The on-disk form is flat and glance-readable — one row per span, each self-explaining. It is the
// CARRIER, deliberately decoupled from the canonical signable payload above (invariant 2): the file
// can read however a human likes; the signature covers the semantic content, not this shape.
//   fingerprint "algorithm:target:value" (none of the three parts contains a colon)
//   lines       "12-40" | "12" | absent
const fingerprintToString = (fp: Fingerprint): string => `${fp.algorithm}:${fp.target}:${fp.value}`;

function fingerprintFromString(s: string): Fingerprint | null {
  const i1 = s.indexOf(":");
  const i2 = s.indexOf(":", i1 + 1);
  if (i1 < 1 || i2 <= i1) return null;
  const value = s.slice(i2 + 1);
  if (!value) return null;
  return { algorithm: s.slice(0, i1), target: s.slice(i1 + 1, i2), value };
}

function linesToString(hint?: { startLine?: number; endLine?: number }): string | undefined {
  if (!hint || hint.startLine === undefined) return undefined;
  return hint.endLine !== undefined && hint.endLine !== hint.startLine ? `${hint.startLine}-${hint.endLine}` : `${hint.startLine}`;
}

function linesFromString(v: unknown): { startLine?: number; endLine?: number } {
  if (typeof v !== "string") return {};
  const m = /^(\d+)(?:-(\d+))?$/.exec(v);
  if (!m) return {};
  const startLine = Number(m[1]);
  return m[2] ? { startLine, endLine: Number(m[2]) } : { startLine };
}

function spanToFlat(a: SpanAttestationV0): Json {
  const o: Record<string, Json> = {};
  if (a.anchor.hint?.path) o.file = a.anchor.hint.path;
  const lines = linesToString(a.anchor.hint);
  if (lines) o.lines = lines;
  o.model = a.attribution.model;
  o.provider = a.attribution.provider;
  if (a.attribution.modelVersion !== undefined) o.modelVersion = a.attribution.modelVersion;
  o.source = a.attribution.source;
  o.operator = a.attribution.operatorId;
  o.fingerprint = fingerprintToString(a.anchor.fingerprint);
  return o;
}

/** Pretty, stable, human-legible on-disk form (flat; includes the signature when present). */
export function serializeSpanManifest(m: SpanManifest): string {
  const flat: Record<string, Json> = {
    madeby: MADEBY_SPANS_TAG,
    commit: m.commit,
    recorded: m.generatedAt,
    spans: m.attestations.map(spanToFlat),
  };
  if (m.signature) flat.signature = m.signature as unknown as Json;
  return JSON.stringify(flat, null, 2) + "\n";
}

/** Parse + validate a manifest; throws on a malformed one (fail safe — never half-trust). */
export function parseSpanManifest(text: string): SpanManifest {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (typeof raw.madeby !== "string" || !raw.madeby.startsWith("spans/")) {
    throw new Error("span manifest: not a madeby spans file (expected 'madeby': 'spans/N')");
  }
  const version = raw.madeby.slice("spans/".length);
  if (typeof raw.commit !== "string" || raw.commit.length === 0) throw new Error("span manifest: missing commit");
  if (typeof raw.recorded !== "string") throw new Error("span manifest: missing recorded");
  if (!Array.isArray(raw.spans)) throw new Error("span manifest: spans must be an array");

  const attestations: SpanAttestationV0[] = raw.spans.map((s, i) => {
    const o = s as Record<string, unknown>;
    const fp = typeof o.fingerprint === "string" ? fingerprintFromString(o.fingerprint) : null;
    if (!fp) throw new Error(`span manifest: span ${i} has a malformed fingerprint`);
    if (typeof o.model !== "string" || typeof o.provider !== "string" || typeof o.operator !== "string" || typeof o.source !== "string") {
      throw new Error(`span manifest: span ${i} has a malformed attribution`);
    }
    const anchor = {
      fingerprint: fp,
      ...(typeof o.file === "string" ? { hint: { path: o.file, ...linesFromString(o.lines) } } : {}),
    };
    const attribution = {
      provider: o.provider,
      model: o.model,
      operatorId: o.operator,
      source: o.source,
      ...(typeof o.modelVersion === "string" ? { modelVersion: o.modelVersion } : {}),
    };
    return { anchor, attribution };
  });

  return {
    version,
    commit: raw.commit,
    generatedAt: raw.recorded,
    attestations,
    ...(raw.signature ? { signature: raw.signature as Signature } : {}),
  };
}
