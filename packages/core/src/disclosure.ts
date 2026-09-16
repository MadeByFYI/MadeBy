// The disclosure-signal recognizer vocabulary. MadeBy's value as a disclosure index and as a PR
// gate is proportional to how much
// EXISTING, in-the-wild disclosure it can recognize — not how much new adoption it can force. So we
// define one normalized vocabulary of disclosure signals and recognize both MadeBy-native carriers
// and external standards. "Recognize everything, own nothing" — the same open posture as the
// carrier registry (ARCHITECTURE §3) and detect-don't-host.
//
// Disclosure, never detection: every signal here is something a party PUT ON THE RECORD (a trailer,
// a sign-off, a signature, a declaration, a committed config, a license id). We recognize declared
// artifacts; we never infer "this looks AI" from style (the research landmine). A recognized signal
// says "origin was disclosed", not "this is/ isn't AI".

import type { TrustTier } from "./tiers";

/** The normalized disclosure vocabulary. Open — extend as new carriers/standards are recognized. */
export type DisclosureKind =
  | "ai-trailer" // Co-Authored-By / Generated-by / Assisted-by naming an AI tool
  | "human-attestation" // affirmative human-authorship claim (Authored-by-human); climbs the ladder like any disclosure
  | "dco-signoff" // Developer Certificate of Origin: `Signed-off-by:`
  | "commit-signature" // a cryptographic signature is present on the commit
  | "ai-tool-config" // a committed AI-tool config (.cursorrules, copilot-instructions, …)
  | "spdx-license" // SPDX-License-Identifier / SPDX-FileCopyrightText metadata
  | "spdx-ai-disclosure" // SPDX-AI-Disclosure AUTHORSHIP tag (the ggfevans/ai-disclosure convention)
  | "reuse" // REUSE-compliant licensing (.reuse/, LICENSES/)
  | "in-toto" // an in-toto attestation predicate
  | "slsa" // SLSA provenance
  | "madeby-manifest" // a .madeby/spans witnessed manifest
  | "madeby-declaration"; // a self-hosted MadeBy attestation (the sworn carrier)

export type DisclosureNativeness = "madeby" | "external";
export type ParserStatus = "recognized" | "planned";

export interface DisclosureKindMeta {
  label: string;
  /** whether the signal is a MadeBy-native carrier or an external standard we recognize */
  nativeness: DisclosureNativeness;
  /** the tier this KIND of signal can support at most (fail-safe: most cap at asserted) */
  ceiling: TrustTier;
  /** 'recognized' = we parse it today; 'planned' = in the vocabulary, parser not yet landed */
  parser: ParserStatus;
}

// The open registry. `planned` entries are honest placeholders (evidence, not guessing): the
// vocabulary is complete so the index/gate can enumerate what disclosure means, and a parser lands
// per standard as we build it (same discipline as the tool-parser harness).
export const DISCLOSURE_KINDS: Record<DisclosureKind, DisclosureKindMeta> = {
  "ai-trailer": { label: "AI-authorship trailer", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  // The AFFIRMATIVE human-authorship claim — the symmetric counterpart of the AI trailer, NOT a
  // separate mechanism: same recognizer, same ladder. A bare trailer is `asserted` (identical to the
  // AI trailer); sign it → verified, swear it → sworn — the signature authenticates WHO is claiming
  // (invariant #10), equally for human or AI disclosure. The one genuine asymmetry is EVIDENCE vs.
  // tier: AI authorship can leave a re-checkable ARTIFACT (a session log matched to the code,
  // `prove`); human authorship is the author's firsthand TESTIMONY — real, but not independently
  // re-checkable, so to a third party it lands as an attestation (asserted → signed → sworn testimony).
  "human-attestation": { label: "human-authorship attestation", nativeness: "madeby", ceiling: "asserted", parser: "recognized" },
  "dco-signoff": { label: "DCO Signed-off-by", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  "commit-signature": { label: "commit signature", nativeness: "external", ceiling: "verified", parser: "recognized" },
  "ai-tool-config": { label: "committed AI-tool config", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  "spdx-license": { label: "SPDX license metadata", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  "spdx-ai-disclosure": { label: "SPDX-AI-Disclosure tag", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  reuse: { label: "REUSE licensing", nativeness: "external", ceiling: "asserted", parser: "planned" },
  "in-toto": { label: "in-toto attestation", nativeness: "external", ceiling: "verified", parser: "planned" },
  slsa: { label: "SLSA provenance", nativeness: "external", ceiling: "verified", parser: "planned" },
  "madeby-manifest": { label: "MadeBy witnessed manifest", nativeness: "madeby", ceiling: "asserted", parser: "recognized" },
  "madeby-declaration": { label: "MadeBy self-hosted declaration", nativeness: "madeby", ceiling: "sworn", parser: "recognized" },
};

/** A recognized disclosure signal — normalized across carriers. */
export interface DisclosureSignal {
  kind: DisclosureKind;
  /** human-readable evidence, e.g. the matched line or path */
  evidence: string;
  /** the tier this specific instance supports (never above its kind's ceiling) */
  tier: TrustTier;
  /** what the disclosure points at, if it names a subject (a manifest ref, a license id, …) */
  subjectRef?: string;
}

// AI-authorship trailers (the disclosure-recognition view). @madeby/classify keeps its own richer
// probabilistic AI_PATTERNS for classification; this is the lean "is origin disclosed via an AI
// trailer" check so the disclosure vocabulary + policy check stay self-contained (node-free, no
// classify dependency — the strip-types CLI can import this file directly). Consolidating the two
// tool lists is a future cleanup.
const AI_TRAILER_RE = /^[ \t]*(?:Co-authored-by|Generated-by|Assisted-by)[ \t]*:[ \t]*(.+?)[ \t]*$/gim;
const AI_MARKER_RE = /\b(?:claude|copilot|cursor(?:agent)?|devin|gemini|chatgpt|openai|codex|gpt-|codeium|windsurf|aider|codewhisperer|tabnine)\b/i;

/** Recognize AI-authorship trailers that name a known AI tool (one signal per trailer). */
export function recognizeAiTrailers(message: string): DisclosureSignal[] {
  const out: DisclosureSignal[] = [];
  for (const m of message.matchAll(AI_TRAILER_RE)) {
    const who = m[1]!;
    if (AI_MARKER_RE.test(who)) out.push({ kind: "ai-trailer", evidence: who, tier: "asserted", subjectRef: who });
  }
  return out;
}

/** Cheap boolean: does this commit disclose AI involvement via a trailer naming an AI tool? */
export function hasAiTrailer(message: string): boolean {
  AI_TRAILER_RE.lastIndex = 0;
  for (const m of message.matchAll(AI_TRAILER_RE)) if (AI_MARKER_RE.test(m[1]!)) return true;
  return false;
}

const DCO_RE = /^[ \t]*Signed-off-by[ \t]*:[ \t]*(.+?)[ \t]*$/gim;
const SPDX_ID_RE = /SPDX-License-Identifier[ \t]*:[ \t]*([^\n\r]+)/gi;
const SPDX_COPYRIGHT_RE = /SPDX-FileCopyrightText[ \t]*:/i;

/** Recognize DCO `Signed-off-by:` sign-offs in a commit message (one signal per signer). */
export function recognizeDcoSignoffs(message: string): DisclosureSignal[] {
  const out: DisclosureSignal[] = [];
  for (const m of message.matchAll(DCO_RE)) {
    out.push({ kind: "dco-signoff", evidence: `Signed-off-by: ${m[1]!}`, tier: "asserted", subjectRef: m[1] });
  }
  return out;
}

/** Cheap boolean: does this commit carry a DCO sign-off? */
export function hasDcoSignoff(message: string): boolean {
  DCO_RE.lastIndex = 0;
  return DCO_RE.test(message);
}

// The affirmative human-authorship convention — the trailer counterpart of the AI trailer, so a
// committer who wrote the code themselves puts it on the record and their work is DISCLOSED-human,
// not lumped into `unknown`. The "tool" is git: add the trailer (an alias/template makes it a
// keystroke). Default key `Authored-by-human` (also `Human-authored-by`); the value is the author,
// for accountability. Climbs the ladder like any disclosure (sign → verified, swear → sworn). If AI
// was used, disclose the AI instead — don't claim human.
const HUMAN_ATTEST_RE = /^[ \t]*(?:Authored-by-human|Human-authored(?:-by)?)[ \t]*:[ \t]*(.+?)[ \t]*$/gim;

/** Cheap boolean: does this commit affirmatively claim human authorship? */
export function hasHumanAttestation(message: string): boolean {
  HUMAN_ATTEST_RE.lastIndex = 0;
  return HUMAN_ATTEST_RE.test(message);
}

// The explicit AI-authorship trailer — the symmetric counterpart of `Authored-by-human`. Its KEY is
// the disclosure ("an AI authored this"), independent of whether the value names a known tool; the
// committer (git author) stays the accountable human. Asserted tier (a self-declared trailer), and it
// climbs the same ladder. `madeby ai` writes it — the honest, log-free `ai` disclosure.
const AI_AUTHOR_RE = /^[ \t]*Authored-by-ai[ \t]*:[ \t]*(.+?)[ \t]*$/gim;

/** Cheap boolean: does this commit attest AI authorship via an `Authored-by-ai:` trailer? */
export function hasAiAuthorship(message: string): boolean {
  AI_AUTHOR_RE.lastIndex = 0;
  return AI_AUTHOR_RE.test(message);
}

/** Recognize SPDX license/copyright metadata in a blob of text (a file header, a manifest). */
export function recognizeSpdxIdentifiers(text: string): DisclosureSignal[] {
  const out: DisclosureSignal[] = [];
  for (const m of text.matchAll(SPDX_ID_RE)) {
    out.push({ kind: "spdx-license", evidence: `SPDX-License-Identifier: ${m[1]!.trim()}`, tier: "asserted", subjectRef: m[1]!.trim() });
  }
  if (SPDX_COPYRIGHT_RE.test(text)) {
    out.push({ kind: "spdx-license", evidence: "SPDX-FileCopyrightText present", tier: "asserted" });
  }
  return out;
}

// SPDX-AI-Disclosure — the AI-AUTHORSHIP tag (distinct from the SPDX *license* metadata above). The
// community convention (ggfevans/ai-disclosure): a file-header tag `SPDX-AI-Disclosure: <value>` with
// four values, optionally companioned by `SPDX-AI-Model:`/`SPDX-AI-Provider:`, plus a repo-level
// `AI_DISCLOSURE.md` default. We recognize it and map it onto the three-way taxonomy — subsume the
// convention, don't compete (ARCHITECTURE §3/§7; ACO §5). Asserted tier: a self-declared header tag.
export type SpdxAiDisclosureValue = "none" | "ai-assisted" | "ai-generated" | "autonomous";

const SPDX_AI_DISCLOSURE_RE = /SPDX-AI-Disclosure[ \t]*:[ \t]*(none|ai-assisted|ai-generated|autonomous)\b/gi;
const AI_DISCLOSURE_DEFAULT_RE = /^[ \t]*disclosure-default[ \t]*:[ \t]*(none|ai-assisted|ai-generated|autonomous)\b/im;

/** Map an SPDX-AI-Disclosure value onto the three-way authorship taxonomy. */
export function spdxAiDisclosureCategory(value: string): "human" | "with_ai" | "ai" | "unknown" {
  switch (value.toLowerCase()) {
    case "none":
      return "human";
    case "ai-assisted":
      return "with_ai";
    case "ai-generated":
    case "autonomous":
      return "ai";
    default:
      return "unknown";
  }
}

/** Recognize SPDX-AI-Disclosure authorship tags in a blob of text (a file header). One signal per tag. */
export function recognizeSpdxAiDisclosures(text: string): DisclosureSignal[] {
  const out: DisclosureSignal[] = [];
  for (const m of text.matchAll(SPDX_AI_DISCLOSURE_RE)) {
    const value = m[1]!.toLowerCase();
    out.push({ kind: "spdx-ai-disclosure", evidence: `SPDX-AI-Disclosure: ${value}`, tier: "asserted", subjectRef: value });
  }
  return out;
}

/** Cheap boolean: does this text carry an SPDX-AI-Disclosure tag? */
export function hasSpdxAiDisclosure(text: string): boolean {
  SPDX_AI_DISCLOSURE_RE.lastIndex = 0;
  return SPDX_AI_DISCLOSURE_RE.test(text);
}

/** Extract the repo-level `disclosure-default` value from an `AI_DISCLOSURE.md` body, or null. */
export function aiDisclosureDefault(md: string): SpdxAiDisclosureValue | null {
  const m = AI_DISCLOSURE_DEFAULT_RE.exec(md);
  return m ? (m[1]!.toLowerCase() as SpdxAiDisclosureValue) : null;
}

/** The distinct disclosure kinds present in a set of signals (for the index / summary). */
export function disclosureKindsPresent(signals: readonly DisclosureSignal[]): DisclosureKind[] {
  return [...new Set(signals.map((s) => s.kind))];
}

/**
 * The per-commit disclosure kinds a single commit carries — the atom the PR-gate policy check
 * evaluates. Pure and self-contained (message recognizers + the signature-presence bit read from
 * git). Repo-level signals (tool config, declaration) are NOT per-commit and are handled separately.
 */
export function commitDisclosureKinds(commit: { message: string; signed?: boolean }): DisclosureKind[] {
  const kinds: DisclosureKind[] = [];
  if (hasAiTrailer(commit.message) || hasAiAuthorship(commit.message)) kinds.push("ai-trailer");
  if (hasHumanAttestation(commit.message)) kinds.push("human-attestation");
  if (hasDcoSignoff(commit.message)) kinds.push("dco-signoff");
  if (commit.signed === true) kinds.push("commit-signature");
  return kinds;
}
