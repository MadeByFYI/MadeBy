// The sworn carrier (ARCHITECTURE.md §3): users self-host a legally-signed declaration that adopts
// a PUBLISHED template; we DETECT it and point to it — we never host it. This module recognizes a
// declaration's text against the versioned template registry and extracts the legal signature, so
// the tier logic grants 'sworn' ONLY for a recognized, FINALIZED template that a named party has
// legally signed. It fails safe in every other case:
//   absent / no block            → asserted (nothing to point at)
//   text modified / unrecognized → asserted ("declaration not recognized")
//   template still 'draft'       → asserted (counsel gate — see below)
//   recognized but unsigned      → asserted (no legal signature = not consequential)
//
// COUNSEL GATE AS A CODE FACT: a template confers the sworn tier only when its status is 'final'.
// The seed template is 'draft' — its legally-operative wording is a placeholder pending counsel
// (COMPLIANCE.md). So today a perfectly-formed, signed declaration is *detected and pointed to* but
// still resolves to 'asserted'. When counsel finalizes the wording, the operative text + hash +
// status flip together (a new/finalized version), and the tier unlocks. Nothing else changes.

import type { SwornAttestation } from "./model";
import type { TrustTier } from "./tiers";
import { FALLBACK_TIER } from "./tiers";

export type TemplateStatus = "draft" | "final";

export interface DeclarationTemplate {
  /** stable id; also the value carried in SwornAttestation.representationCode */
  id: string;
  /** human version tag, e.g. "v1" (matches the BEGIN/END delimiter) */
  version: string;
  /** 'final' is the counsel gate: only a finalized template can confer the sworn tier */
  status: TemplateStatus;
  /** sha256 (hex) of the canonicalized legally-operative body — the recognition key */
  operativeHash: string;
}

/**
 * The legally-operative body of MadeBy Attestation v1 — the source of truth for the published
 * template file (packages/core/templates/MADEBY-ATTESTATION-v1.md embeds this verbatim; a test
 * asserts they match). This is a DRAFT placeholder, NOT final legal text (status 'draft' below).
 */
export const MADEBY_ATTESTATION_V1_OPERATIVE = `[DRAFT — NOT FINAL LEGAL TEXT; PENDING COUNSEL REVIEW (COMPLIANCE.md). This placeholder
fixes the format so the detector and carrier can be built and tested; it confers NO trust
tier until finalized.]

I, the undersigned, declare that the authorship and AI-assistance breakdown recorded in the
MadeBy manifest referenced below is accurate and complete to the best of my knowledge, and I
make this declaration understanding that others may rely on it.`;

/** Registered declaration templates. Add a finalized version here to unlock the sworn tier for it. */
export const DECLARATION_TEMPLATES: readonly DeclarationTemplate[] = [
  {
    id: "madeby-attestation-v1",
    version: "v1",
    status: "draft",
    // sha256 of canonicalizeOperative(MADEBY_ATTESTATION_V1_OPERATIVE); pinned + verified by test.
    operativeHash: "1b3ac1c0d7da2e01a58a8cdf5ecbc7756f3bea81cbc2a126ceff4ddc74ac67a8",
  },
];

function templateById(id: string): DeclarationTemplate | undefined {
  return DECLARATION_TEMPLATES.find((t) => t.id === id);
}

function templateByHash(hash: string): DeclarationTemplate | undefined {
  return DECLARATION_TEMPLATES.find((t) => t.operativeHash === hash);
}

/**
 * Canonicalize the operative body for hashing: normalize line endings, trim each line, drop blank
 * lines. Robust to indentation/whitespace drift when a user pastes the block; sensitive to the
 * actual words — so watering down the declaration's wording breaks recognition (it can't keep the
 * tier). Fill-in fields (name/date/subject) live OUTSIDE this block, so they never affect the hash.
 */
export function canonicalizeOperative(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const bytes = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, "0");
  return out;
}

/** sha256 hex of the canonicalized operative body — the template recognition key. */
export function operativeHash(operativeBody: string): Promise<string> {
  return sha256Hex(canonicalizeOperative(operativeBody));
}

export interface DeclarationDetection {
  /** id of the template whose operative hash matched, or null if unrecognized/modified */
  templateId: string | null;
  /** version parsed from the delimiter header (untrusted display hint) */
  declaredVersion: string;
  /** the legal signatory name from the signature block, or null if absent/unfilled */
  signatureName: string | null;
  /** the declaration date from the signature block, or null if absent/unfilled */
  signedAt: string | null;
  /** the manifest/repo reference the declaration points at, or null (two-hash invariant: a pointer) */
  subjectRef: string | null;
}

const BLOCK_RE =
  /-----BEGIN MADEBY ATTESTATION (v\d+)-----\r?\n([\s\S]*?)\r?\n-----END MADEBY ATTESTATION \1-----/;

/** Read a signature-block field; treat an unfilled `<...>` / `{{...}}` placeholder as absent. */
function field(text: string, name: string): string | null {
  const m = text.match(new RegExp(`^[ \\t]*${name}[ \\t]*:[ \\t]*(.+?)[ \\t]*$`, "m"));
  if (!m) return null;
  const v = m[1]!.trim();
  if (!v || /^<.*>$/.test(v) || /^\{\{.*\}\}$/.test(v)) return null;
  return v;
}

/**
 * Detect a self-hosted MadeBy attestation in `text`. Returns null if no attestation block is
 * present at all. If a block is present, `templateId` is set iff the operative body matches a
 * registered template verbatim (canonicalized); otherwise it stays null (modified/unknown → caps
 * at asserted downstream). Never throws.
 */
export async function detectDeclaration(text: string): Promise<DeclarationDetection | null> {
  const block = BLOCK_RE.exec(text);
  if (!block) return null;
  const declaredVersion = block[1]!;
  const body = block[2]!;
  const hash = await operativeHash(body);
  const template = templateByHash(hash);
  const after = text.slice(block.index + block[0].length);
  return {
    templateId: template ? template.id : null,
    declaredVersion,
    signatureName: field(after, "Signed"),
    signedAt: field(after, "Date"),
    subjectRef: field(after, "Subject"),
  };
}

/**
 * The effective tier of a detected declaration — the fail-safe ladder in one place, reused by the
 * mirror (no Claim needed) and mirrored by resolveTier's sworn branch. sworn requires: a recognized
 * template, that template FINALIZED (counsel gate), and a legal signature. Anything else → asserted.
 */
export function declarationTier(d: DeclarationDetection | null): TrustTier {
  if (!d || !d.templateId) return FALLBACK_TIER;
  const t = templateById(d.templateId);
  if (!t || t.status !== "final") return FALLBACK_TIER;
  if (!d.signatureName) return FALLBACK_TIER;
  return "sworn";
}

/**
 * Whether a SwornAttestation.representationCode names a recognized, FINALIZED template. Used by
 * resolveTier so the trust-critical path caps unrecognized/draft representations at asserted
 * (the invariant #3 analog for the sworn carrier).
 */
export function recognizesSwornRepresentation(representationCode: string): boolean {
  const t = templateById(representationCode);
  return !!t && t.status === "final";
}

/** Build a SwornAttestation overlay from a recognized, signed detection (for the Claim path). */
export function swornAttestationFrom(d: DeclarationDetection): SwornAttestation | null {
  if (!d.templateId || !d.signatureName || !d.signedAt) return null;
  return { representationCode: d.templateId, signatureName: d.signatureName, signedAt: d.signedAt };
}
