// v0 span-attribution convention (ARCHITECTURE.md §4; shared with the dogfood Phase 0, #2).
//
// Design commitments:
//  - out-of-band & content-anchored (git-notes ref or .madeby/ sidecar), NOT inline comments —
//    anchored by the span's structural fingerprint so attribution survives the file moving.
//  - the OPERATOR's key signs, never "the AI": the attestation carries provider/model + operatorId.
//  - model-agnostic open fields — any agent (Claude/Copilot/Cursor/…) can emit it.
//
// A span attestation is just a Claim whose subject is the span's structural fingerprint; these
// types describe the span-specific shape carried alongside it.

import type { Fingerprint } from "./fingerprint";

export interface SpanAnchor {
  /** structural fingerprint of the span's normalized content — the durable anchor */
  fingerprint: Fingerprint;
  /** non-authoritative locator hint (line numbers drift; never relied on for identity) */
  hint?: { path: string; startLine?: number; endLine?: number };
}

export interface SpanAttribution {
  /** open fields — never a hardcoded model enum */
  provider: string;
  model: string;
  modelVersion?: string;
  /** the human/org operator whose key stands behind the AI-authored span */
  operatorId: string;
  /** source of the evidence, e.g. "claude-code-session-log" */
  source: string;
}

export interface SpanAttestationV0 {
  anchor: SpanAnchor;
  attribution: SpanAttribution;
}
