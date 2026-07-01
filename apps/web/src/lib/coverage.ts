// Coverage-led framing for the mirror result (review 2026-06-30, Finding 1 follow-up #3 + v3
// residual #4). We never lead with a confident "human" ratio — untrailered-AI recall is 0%. We
// lead with what we can PROVE and split the rest honestly:
//   - provable AI          — commits with a positive AI signal;
//   - human-attributed     — a named human committed these, AI involvement UNKNOWN (may be
//                            undisclosed AI). NOT "we can't see how it was made" — we know who.
//   - fully unattributed   — no author on record (≈0 in git); genuinely unknown.
// The earlier v0 folded human-attributed into "unattributed," which overstated the unknown.

export interface MirrorCoverage {
  /** % of commits with a positive AI signal — what we can actually prove */
  provableAiPercent: number;
  /** % with a named human author but no AI signal — AI involvement unknown (possibly undisclosed) */
  humanAttributedPercent: number;
  /** % with no author info at all — genuinely unattributed */
  fullyUnattributedPercent: number;
  /** most of the repo is not provably AI → a "human" reading is weak (often undisclosed AI) */
  weakHumanSignal: boolean;
}

/** Derive the three-way coverage split from the commit-level facets. */
export function mirrorCoverage(aiInvolvedPercent: number, unattributedPercent: number): MirrorCoverage {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const provableAi = clamp(aiInvolvedPercent);
  const fullyUnattributed = Math.max(0, Math.min(100 - provableAi, Math.round(unattributedPercent)));
  const humanAttributed = Math.max(0, 100 - provableAi - fullyUnattributed);
  return {
    provableAiPercent: provableAi,
    humanAttributedPercent: humanAttributed,
    fullyUnattributedPercent: fullyUnattributed,
    weakHumanSignal: provableAi < 50,
  };
}
