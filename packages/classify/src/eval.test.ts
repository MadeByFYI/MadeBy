import { describe, it, expect } from "vitest";
import { runEval } from "./eval";

// Regression FLOORS, not a per-case gate. Per TESTING.md §8 the eval gates *claims about
// accuracy* (so a published number can't silently rot), not every deploy. Floors sit well
// below the measured numbers so honest classifier changes don't trip them; a real regression
// (e.g. false-positives on human edge cases) breaks precision and fails here.
describe("classifier calibration eval (probabilistic regime)", () => {
  const report = runEval();

  it("is labeled an estimate, never a guarantee", () => {
    expect(report.isEstimate).toBe(true);
    expect(report.total).toBeGreaterThanOrEqual(20);
  });

  it("clears the overall accuracy floor", () => {
    expect(report.accuracy).toBeGreaterThanOrEqual(0.7);
  });

  it("does not over-claim AI involvement (precision floor — the sev-0 direction)", () => {
    // A false positive ("this human used AI") is the reputational-harm failure. Hold it high.
    expect(report.aiInvolved.precision).toBeGreaterThanOrEqual(0.9);
  });

  it("recall stays above the floor while honestly missing untrailered AI", () => {
    // Recall is deliberately < 1: the benchmark includes untrailered-AI cases the commit-level
    // signal cannot catch. We measure the gap rather than hide it.
    expect(report.aiInvolved.recall).toBeGreaterThanOrEqual(0.6);
    expect(report.aiInvolved.recall).toBeLessThan(1);
  });

  it("is reasonably calibrated", () => {
    expect(report.calibration.length).toBeGreaterThan(0);
    expect(report.ece).toBeLessThanOrEqual(0.3);
  });
});
