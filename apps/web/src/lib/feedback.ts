// The one feedback primitive that does triple duty (review 2026-06-29, Concern A):
//   1. user correction (UX)  2. labeled eval data (quality)  3. conversion signal (growth).
// A Correction is all three. This module is the pure core (validation + the eval-label bridge);
// the store is store.ts, the funnel event is analytics.ts, the UI + route wire them together.

export type CorrectionKind = "not-mine" | "wrong-contributors" | "wrong-ai-mix" | "other";
const KINDS: readonly CorrectionKind[] = ["not-mine", "wrong-contributors", "wrong-ai-mix", "other"];

export interface CorrectionInput {
  repo?: unknown;
  kind?: unknown;
  /** what the user says is actually true */
  correction?: unknown;
  note?: unknown;
}

export interface Correction {
  repo: string;
  kind: CorrectionKind;
  correction: string;
  note?: string;
  at: string; // RFC 3339
}

const MAX = 2000;

/** Validate + normalize raw form input into a Correction, or return a human-readable error. */
export function validateCorrection(input: CorrectionInput, now: string): Correction | { error: string } {
  const repo = typeof input.repo === "string" ? input.repo.trim() : "";
  if (!repo) return { error: "missing repo" };

  const kind = typeof input.kind === "string" && (KINDS as readonly string[]).includes(input.kind)
    ? (input.kind as CorrectionKind)
    : "other";

  const correction = typeof input.correction === "string" ? input.correction.trim().slice(0, MAX) : "";
  if (!correction) return { error: "tell us what's actually true" };

  const noteRaw = typeof input.note === "string" ? input.note.trim().slice(0, MAX) : "";
  return { repo, kind, correction, ...(noteRaw ? { note: noteRaw } : {}), at: now };
}

/** Eval-label bridge: a correction is labeled training/eval data for the classifier (closes the
 *  data-acquisition gap — the synthetic benchmark "grows as real corpora are labeled"). #73 ingests. */
export interface EvalLabel {
  subject: string;
  kind: CorrectionKind;
  truth: string;
  capturedAt: string;
}
export function correctionToLabel(c: Correction): EvalLabel {
  return { subject: c.repo, kind: c.kind, truth: c.correction, capturedAt: c.at };
}

/** One JSONL line for the append-only label store. */
export function serializeCorrection(c: Correction): string {
  return JSON.stringify(c);
}
export function parseCorrection(line: string): Correction | null {
  try {
    const o = JSON.parse(line) as Correction;
    return o && typeof o.repo === "string" && typeof o.correction === "string" ? o : null;
  } catch {
    return null;
  }
}
