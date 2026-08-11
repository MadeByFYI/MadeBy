// Aggregate classification — a COMPUTED, labeled estimate (mirrors the coverage-view rule:
// invariants #4/#6). Percentages are derived at the edge, never stored as ground truth.

import type { AuthorClass, CommitClassification } from "./classify";

export interface ClassificationSummary {
  /** always true — this is an estimate, never asserted as truth */
  readonly isEstimate: true;
  readonly methodology: string;
  readonly total: number;
  readonly byClass: Readonly<Record<AuthorClass, number>>;
  /** mean per-commit confidence — surfaced alongside any headline number */
  readonly meanConfidence: number;
}

export function summarize(
  classifications: readonly CommitClassification[],
  methodology = "commit-level Co-Authored-By + author heuristic (estimate)",
): ClassificationSummary {
  const byClass: Record<AuthorClass, number> = { human: 0, ai: 0, with_ai: 0, bot: 0 };
  let confSum = 0;
  for (const c of classifications) {
    byClass[c.class] += 1;
    confSum += c.confidence;
  }
  return {
    isEstimate: true,
    methodology,
    total: classifications.length,
    byClass,
    meanConfidence: classifications.length ? confSum / classifications.length : 0,
  };
}
