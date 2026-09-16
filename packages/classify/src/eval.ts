// Calibration / eval harness for the probabilistic classifier (TESTING.md §1/§5). Unlike the
// deterministic conformance vectors (exact pass/fail), this MEASURES statistical quality —
// accuracy, precision/recall on AI-involvement, and calibration (does the confidence match the
// empirical accuracy?) — over a labeled benchmark. The published numbers come from here; the
// benchmark deliberately includes untrailered-AI cases so recall is reported honestly.

import benchmarkJson from "./benchmark/benchmark-v0.json";
import { classifyCommit, type AuthorClass, type CommitMeta } from "./classify";

export const BENCHMARK_VERSION: string = (benchmarkJson as { version: string }).version;

interface BenchmarkCase extends CommitMeta {
  expected: AuthorClass;
  note?: string;
}
const CASES = (benchmarkJson as unknown as { cases: BenchmarkCase[] }).cases;

const CLASSES: AuthorClass[] = ["human", "ai", "with_ai", "bot"];
const isAiInvolved = (c: AuthorClass) => c === "ai" || c === "with_ai";

export interface EvalReport {
  readonly isEstimate: true;
  readonly methodology: string;
  readonly total: number;
  readonly accuracy: number;
  /** actual class → predicted class → count */
  readonly confusion: Record<AuthorClass, Record<AuthorClass, number>>;
  /** binary metrics treating ai|with_ai as the positive ("AI-involved") class */
  readonly aiInvolved: { precision: number; recall: number; f1: number };
  /** per-confidence-level reliability (predicted confidence vs actual accuracy) */
  readonly calibration: { confidence: number; n: number; accuracy: number }[];
  /** expected calibration error (lower = better calibrated) */
  readonly ece: number;
}

export function runEval(cases: readonly BenchmarkCase[] = CASES): EvalReport {
  const confusion = Object.fromEntries(
    CLASSES.map((a) => [a, Object.fromEntries(CLASSES.map((p) => [p, 0])) as Record<AuthorClass, number>]),
  ) as Record<AuthorClass, Record<AuthorClass, number>>;

  let correct = 0;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const byConf = new Map<number, { n: number; correct: number }>();

  for (const c of cases) {
    const pred = classifyCommit(c);
    const ok = pred.class === c.expected;
    confusion[c.expected][pred.class] += 1;
    if (ok) correct += 1;

    const actualPos = isAiInvolved(c.expected);
    const predPos = isAiInvolved(pred.class);
    if (actualPos && predPos) tp += 1;
    else if (!actualPos && predPos) fp += 1;
    else if (actualPos && !predPos) fn += 1;

    const bucket = byConf.get(pred.confidence) ?? { n: 0, correct: 0 };
    bucket.n += 1;
    if (ok) bucket.correct += 1;
    byConf.set(pred.confidence, bucket);
  }

  const total = cases.length;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const calibration = [...byConf.entries()]
    .map(([confidence, b]) => ({ confidence, n: b.n, accuracy: b.correct / b.n }))
    .sort((a, b) => a.confidence - b.confidence);
  const ece = calibration.reduce((acc, c) => acc + (c.n / total) * Math.abs(c.confidence - c.accuracy), 0);

  return {
    isEstimate: true,
    methodology: "commit-level Co-Authored-By + author heuristic, evaluated on the v0 labeled benchmark (estimate)",
    total,
    accuracy: correct / total,
    confusion,
    aiInvolved: { precision, recall, f1 },
    calibration,
    ece,
  };
}
