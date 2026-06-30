// Coverage-led framing for the mirror result (review 2026-06-30, Finding 1 follow-up #3).
//
// The trap: an untrailered-AI miss reads as a confident "🧑 95% human" — silent and wrong, since
// the detector's recall on untrailered AI is 0% (GROUND-TRUTH.md). So we never lead with a "human"
// ratio. We lead with what we can *prove* (AI involvement we have positive evidence for) and make
// the rest an explicit **unattributed** fraction — "we can't see how it was made" — which is both
// honest and a better conversion hook than a fake number.

export interface MirrorCoverage {
  /** % of commits with a positive AI signal — what we can actually prove */
  provablePercent: number;
  /** % of commits with no signal either way — NOT proven human ("we can't see how it was made") */
  unattributedPercent: number;
  /** the unattributed fraction dominates → a "human" reading is weak evidence (often undisclosed AI) */
  weakHumanSignal: boolean;
}

/** Derive the coverage framing from the commit-level AI-involvement estimate. */
export function mirrorCoverage(aiInvolvedPercent: number): MirrorCoverage {
  const provable = Math.max(0, Math.min(100, Math.round(aiInvolvedPercent)));
  const unattributed = 100 - provable;
  return { provablePercent: provable, unattributedPercent: unattributed, weakHumanSignal: unattributed >= 50 };
}
