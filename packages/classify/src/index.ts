// @madeby/classify — the probabilistic regime: human/AI authorship estimation.
// Evaluated by benchmark + calibration (#20), not conformance vectors. Kept separate from
// @madeby/core (the deterministic, verifiable trust logic) by design (TESTING.md §1).

export { classifyCommit } from "./classify";
export type { AuthorClass, CommitMeta, CommitClassification, AiContributor } from "./classify";

export { summarize } from "./aggregate";
export type { ClassificationSummary } from "./aggregate";

export { runEval, BENCHMARK_VERSION } from "./eval";
export type { EvalReport } from "./eval";

export { runGroundTruth, GROUND_TRUTH_VERSION } from "./ground-truth";
export type { GroundTruthReport } from "./ground-truth";
