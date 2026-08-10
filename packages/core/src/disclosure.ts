// The disclosure-signal recognizer vocabulary (STRATEGY §3 — the maintainer-wedge + public-index
// initiative). MadeBy's value as a disclosure index and as a PR gate is proportional to how much
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
  | "dco-signoff" // Developer Certificate of Origin: `Signed-off-by:`
  | "commit-signature" // a cryptographic signature is present on the commit
  | "ai-tool-config" // a committed AI-tool config (.cursorrules, copilot-instructions, …)
  | "spdx-license" // SPDX-License-Identifier / SPDX-FileCopyrightText metadata
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
  "dco-signoff": { label: "DCO Signed-off-by", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  "commit-signature": { label: "commit signature", nativeness: "external", ceiling: "verified", parser: "recognized" },
  "ai-tool-config": { label: "committed AI-tool config", nativeness: "external", ceiling: "asserted", parser: "recognized" },
  "spdx-license": { label: "SPDX license metadata", nativeness: "external", ceiling: "asserted", parser: "recognized" },
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

/** The distinct disclosure kinds present in a set of signals (for the index / summary). */
export function disclosureKindsPresent(signals: readonly DisclosureSignal[]): DisclosureKind[] {
  return [...new Set(signals.map((s) => s.kind))];
}
