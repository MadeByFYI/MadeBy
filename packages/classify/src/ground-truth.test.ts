import { describe, it, expect } from "vitest";
import { runGroundTruth } from "./ground-truth";

// This eval's job is HONESTY, not a score to maximize. It pins two true facts about the v0
// trailer-only classifier: (1) it never over-claims about a human, and (2) it is structurally
// blind to untrailered AI. When session-log evidence (#68) lands, fact (2) changes and the
// untrailered assertion updates with it.
describe("independent ground-truth correctness check", () => {
  const r = runGroundTruth();

  it("is an estimate over a real corpus", () => {
    expect(r.isEstimate).toBe(true);
    expect(r.total).toBeGreaterThanOrEqual(15);
  });

  it("NEVER false-positives a human (the sev-0 direction)", () => {
    expect(r.humanFalsePositives).toBe(0);
  });

  it("catches trailered AI reliably (trailers are strong evidence)", () => {
    expect(r.trailered.total).toBeGreaterThan(0);
    expect(r.trailered.recall).toBe(1);
  });

  it("is BLIND to untrailered AI — recall 0 — the documented real-world blind spot", () => {
    expect(r.untrailered.total).toBeGreaterThan(0);
    // A trailer-only detector cannot see AI that left no trailer. We assert this rather than hide
    // it behind the synthetic benchmark's blended recall. Improving it is #68's job (session logs).
    expect(r.untrailered.recall).toBe(0);
  });
});
