// Independent ground-truth eval (TESTING.md §6; review 2026-06-29). A CORRECTNESS check, not the
// circular dogfood canary (which tests our trailer-regex against trailers we wrote) and not the
// synthetic benchmark. Labels here rest on provenance OTHER than the trailer (see the corpus note),
// so this measures what the classifier actually gets right — and, as the honest headline, its
// **recall on untrailered AI** (the real-world blind spot a trailer-only detector cannot see).

import groundTruthJson from "./benchmark/ground-truth-v0.json";
import { classifyCommit, type AuthorClass, type CommitMeta } from "./classify";

export const GROUND_TRUTH_VERSION: string = (groundTruthJson as { version: string }).version;

interface GroundTruthCase extends CommitMeta {
  expected: AuthorClass;
  provenanceBasis: string;
  /** true ⇒ AI-authored but carrying NO trailer — the blind spot */
  untrailered?: boolean;
}
const CASES = (groundTruthJson as unknown as { cases: GroundTruthCase[] }).cases;

const isAiInvolved = (c: AuthorClass) => c === "ai" || c === "with_ai";

export interface GroundTruthReport {
  readonly isEstimate: true;
  readonly methodology: string;
  readonly total: number;
  readonly accuracy: number;
  /** sev-0 property: human-authored cases mislabeled AI-involved (over-claiming about a person) */
  readonly humanFalsePositives: number;
  /** THE honest headline: recall on AI-involved commits that carry NO trailer */
  readonly untrailered: { total: number; detected: number; recall: number };
  /** recall on AI-involved commits that DO carry a trailer (trailers are reliable → high) */
  readonly trailered: { total: number; detected: number; recall: number };
}

export function runGroundTruth(cases: readonly GroundTruthCase[] = CASES): GroundTruthReport {
  let correct = 0;
  let humanFalsePositives = 0;
  let untrailTotal = 0;
  let untrailDetected = 0;
  let trailTotal = 0;
  let trailDetected = 0;

  for (const c of cases) {
    const predicted = classifyCommit(c).class;
    if (predicted === c.expected) correct += 1;
    if (c.expected === "human" && isAiInvolved(predicted)) humanFalsePositives += 1;

    if (isAiInvolved(c.expected)) {
      const detected = isAiInvolved(predicted);
      if (c.untrailered) {
        untrailTotal += 1;
        if (detected) untrailDetected += 1;
      } else {
        trailTotal += 1;
        if (detected) trailDetected += 1;
      }
    }
  }

  const recall = (d: number, t: number) => (t === 0 ? 1 : d / t);
  return {
    isEstimate: true,
    methodology:
      "independent corpus; labels from era / autonomous-agent account / publicly-documented AI builds — never the trailer (estimate)",
    total: cases.length,
    accuracy: cases.length ? correct / cases.length : 0,
    humanFalsePositives,
    untrailered: { total: untrailTotal, detected: untrailDetected, recall: recall(untrailDetected, untrailTotal) },
    trailered: { total: trailTotal, detected: trailDetected, recall: recall(trailDetected, trailTotal) },
  };
}
