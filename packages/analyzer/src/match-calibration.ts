// Structural-match threshold calibration (#86; TESTING §5 calibration regime). `capture-local`'s
// cosine floor gates the ONE place a WITNESSED attestation can over-claim — attesting AI content that
// isn't actually what shipped — so the threshold is chosen from labeled data, biased toward DISCARD
// (precision over recall: never attest AI that didn't land), not a hardcoded magic 0.5. Model-free,
// deterministic, reproducible: `runMatchCalibration()` is exported and the labeled corpus lives here.

import { structuralFingerprint, cosineSimilarity } from "@madeby/core/structural";

export type MatchLabel = "match" | "discard";

export interface MatchCase {
  /** content the tool recorded the AI writing */
  ai: string;
  /** content present at the SAME path in the checkout (the join is by path; this is content-vs-content) */
  committed: string;
  expected: MatchLabel;
  /** transform class: reformat | rename | comment | fragment-substantial | exact | rewrite | unrelated | fragment-tiny */
  kind: string;
  note: string;
}

/** Same-STRUCTURE, different-CONTENT pairs. Identifier canonicalization (structural-v1) erases the
 *  difference, so these collide near 1.0 and NO threshold separates them — the documented precision
 *  ceiling of structural-only matching. Reported, never used to pick the threshold. */
export interface CollisionCase {
  ai: string;
  committed: string;
  note: string;
}

/** cosine of the two structural fingerprints — the exact quantity `capture-local` thresholds. */
export function similarity(ai: string, committed: string): number {
  return cosineSimilarity(structuralFingerprint(ai).embedding, structuralFingerprint(committed).embedding);
}

const price = `export function totalPrice(items) {
  let sum = 0;
  for (const it of items) {
    sum += it.price * it.qty;
  }
  return sum;
}`;

const otherFns = `export async function fetchUser(id) {
  const res = await db.query('select * from users where id=$1', [id]);
  return res.rows[0] ?? null;
}

export function slug(s) { return s.toLowerCase().replace(/\\s+/g, '-'); }`;

export const MATCH_CASES: MatchCase[] = [
  // ---- positives: the AI's content IS what shipped, modulo a cosmetic/structural-preserving change ----
  { ai: price, committed: price, expected: "match", kind: "exact", note: "identical content" },
  {
    ai: price,
    committed: `export function totalPrice(items){let sum=0;for(const it of items){sum+=it.price*it.qty}return sum}`,
    expected: "match",
    kind: "reformat",
    note: "whitespace + semicolons collapsed (a formatter ran)",
  },
  {
    ai: price,
    committed: `export function total(list) {\n  let acc = 0;\n  for (const row of list) { acc += row.cost * row.count; }\n  return acc;\n}`,
    expected: "match",
    kind: "rename",
    note: "identifiers renamed; structure identical",
  },
  {
    ai: price,
    committed: `// compute the order total\nexport function totalPrice(items) {\n  let sum = 0; // accumulator\n  for (const it of items) {\n    sum += it.price * it.qty;\n  }\n  return sum;\n}`,
    expected: "match",
    kind: "comment",
    note: "comments added around identical code",
  },
  {
    ai: price,
    committed: `${price}\n\n${otherFns}`,
    expected: "match",
    kind: "fragment-substantial",
    note: "AI wrote one of three functions — a substantial share of the file",
  },
  {
    ai: `export function total(list) {\n  let acc = 0;\n  for (const row of list) acc += row.cost * row.count;\n  return acc;\n}`,
    committed: `export function total(list) {\n  let acc = 0;\n  for (const row of list) acc += row.cost * row.count;\n  if (acc < 0) acc = 0;\n  return acc;\n}`,
    expected: "match",
    kind: "minor-edit",
    note: "one guard line added after the AI wrote it",
  },
  // ---- negatives: attesting the AI here would over-claim; we WANT these discarded ----
  {
    ai: price,
    committed: `export const totalPrice = (items) => items.reduce((s, it) => s + it.price * it.qty, 0);`,
    expected: "discard",
    kind: "rewrite",
    note: "same task, rewritten to a different structure — the AI's version did not ship",
  },
  { ai: price, committed: otherFns, expected: "discard", kind: "unrelated", note: "different code at this path" },
  {
    ai: `export const VERSION = '1.2.3';`,
    committed: `export const VERSION = '1.2.3';\n${Array.from({ length: 30 }, (_, i) => `export function f${i}(x){ return x * ${i}; }`).join("\n")}`,
    expected: "discard",
    kind: "fragment-tiny",
    note: "AI wrote one line of a large file — attesting the file would over-claim (precision bias)",
  },
];

export const COLLISION_CASES: CollisionCase[] = [
  { ai: `interface User { id: string; name: string; age: number; }`, committed: `interface Car { vin: string; make: string; year: number; }`, note: "two different 3-field interfaces" },
  { ai: `get total() { return this.items.length; }`, committed: `get width() { return this.pixels.length; }`, note: "two different getters" },
  { ai: `async function a(id){ const r = await db.query('q',[id]); return r.rows[0]; }`, committed: `async function b(sku){ const r = await db.query('z',[sku]); return r.rows[0]; }`, note: "two different single-query functions" },
];

export interface SweepPoint {
  threshold: number;
  precision: number;
  recall: number;
}

export interface CalibrationReport {
  readonly isEstimate: true;
  /** the calibrated threshold `capture-local` should use */
  chosen: number;
  /** precision (never over-claim) and recall (catch real matches) at `chosen`, over MATCH_CASES */
  precision: number;
  recall: number;
  /** [exclusive-lower, inclusive-upper] threshold band that achieves precision 1.0 with full recall */
  precisionOneBand: [number, number];
  sweep: SweepPoint[];
  /** documented residual: same-structure/different-content collisions that still match at `chosen` */
  collisionsMatchedAtChosen: number;
  collisionsTotal: number;
  rationale: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calibrate the discard-biased match threshold from the labeled corpus. Chooses the MIDPOINT of the
 * precision-1.0 band — the most robust point, with margin above the highest genuine negative and below
 * the lowest true positive — rather than the recall-maximizing edge, to honor the discard bias.
 */
export function runMatchCalibration(cases: readonly MatchCase[] = MATCH_CASES, collisions: readonly CollisionCase[] = COLLISION_CASES): CalibrationReport {
  const scored = cases.map((c) => ({ ...c, sim: similarity(c.ai, c.committed) }));
  const posSims = scored.filter((c) => c.expected === "match").map((c) => c.sim);
  const negSims = scored.filter((c) => c.expected === "discard").map((c) => c.sim);
  const lowestPositive = Math.min(...posSims);
  const highestNegative = Math.max(...negSims);

  // separable ⇒ any threshold in (highestNegative, lowestPositive] gives precision 1.0 AND full
  // recall. Pick the midpoint (discard-biased margin). If NOT separable, sit just above the highest
  // negative: precision 1.0, reduced recall — the sev-0-safe choice.
  const separable = highestNegative < lowestPositive;
  const chosen = round2(separable ? (highestNegative + lowestPositive) / 2 : highestNegative + 0.01);

  const at = (t: number) => {
    let tp = 0,
      fp = 0,
      fn = 0;
    for (const c of scored) {
      const predMatch = c.sim >= t;
      if (c.expected === "match") predMatch ? tp++ : fn++;
      else if (predMatch) fp++;
    }
    return { precision: tp + fp === 0 ? 1 : tp / (tp + fp), recall: tp + fn === 0 ? 1 : tp / (tp + fn) };
  };

  const sweep: SweepPoint[] = [];
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const { precision, recall } = at(round2(t));
    sweep.push({ threshold: round2(t), precision: round2(precision), recall: round2(recall) });
  }
  const here = at(chosen);
  const collisionsMatchedAtChosen = collisions.filter((c) => similarity(c.ai, c.committed) >= chosen).length;

  return {
    isEstimate: true,
    chosen,
    precision: round2(here.precision),
    recall: round2(here.recall),
    precisionOneBand: [round2(highestNegative), round2(lowestPositive)],
    sweep,
    collisionsMatchedAtChosen,
    collisionsTotal: collisions.length,
    rationale: separable
      ? `separable corpus: genuine negatives top out at ${round2(highestNegative)}, true positives bottom at ${round2(lowestPositive)}; chose the band midpoint ${chosen} for discard-biased margin (precision 1.0, recall 1.0). Same-structure/different-content collisions (${collisionsMatchedAtChosen}/${collisions.length}) still match — the documented precision ceiling of structural-v1, bounded by path-anchoring + self-attestation, not by this threshold.`
      : `NOT separable: chose ${chosen} just above the highest negative for precision 1.0 at reduced recall (sev-0-safe).`,
  };
}
