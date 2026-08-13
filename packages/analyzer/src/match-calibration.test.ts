import { describe, it, expect } from "vitest";
import { runMatchCalibration, MATCH_CASES, COLLISION_CASES, similarity } from "./match-calibration";
import { MATCH_THRESHOLD } from "./capture-local";

// #86 — the calibration report's job is HONESTY about the one place a witnessed attestation can
// over-claim. It pins: (1) at the chosen threshold we NEVER attest AI that didn't ship (precision 1.0
// — the sev-0 direction), (2) the shipped threshold equals the corpus-derived value (no silent drift),
// and (3) we openly report the residual structural-only cannot fix.
describe("structural-match threshold calibration", () => {
  const r = runMatchCalibration();

  it("is a reproducible estimate over a labeled corpus", () => {
    expect(r.isEstimate).toBe(true);
    expect(MATCH_CASES.length).toBeGreaterThanOrEqual(8);
  });

  it("achieves precision 1.0 at the chosen threshold — never attests AI that didn't ship (sev-0)", () => {
    expect(r.precision).toBe(1);
  });

  it("keeps recall honest (catches reformatted/renamed/substantial-fragment matches)", () => {
    expect(r.recall).toBeGreaterThanOrEqual(0.9);
  });

  it("ships the corpus-derived threshold — capture-local cannot silently drift from the data", () => {
    expect(MATCH_THRESHOLD).toBe(r.chosen);
    // and the chosen value sits strictly inside the precision-1.0 band, with margin
    const [hiNeg, loPos] = r.precisionOneBand;
    expect(r.chosen).toBeGreaterThan(hiNeg);
    expect(r.chosen).toBeLessThanOrEqual(loPos);
  });

  it("openly reports the residual: same-structure/different-content still matches (structural-v1 ceiling)", () => {
    // We do NOT pretend the threshold catches this — it can't. Surfacing it is the point.
    expect(r.collisionsMatchedAtChosen).toBe(r.collisionsTotal);
    expect(r.collisionsTotal).toBeGreaterThan(0);
    for (const c of COLLISION_CASES) expect(similarity(c.ai, c.committed)).toBeGreaterThan(r.chosen);
  });

  it("genuine negatives (rewrite/unrelated/tiny-fragment) fall below the threshold", () => {
    for (const c of MATCH_CASES.filter((x) => x.expected === "discard")) {
      expect(similarity(c.ai, c.committed)).toBeLessThan(r.chosen);
    }
  });
});
