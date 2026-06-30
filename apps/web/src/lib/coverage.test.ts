import { describe, it, expect } from "vitest";
import { mirrorCoverage } from "./coverage";

describe("mirrorCoverage — lead with provable, never a confident 'human' ratio", () => {
  it("splits into provable + unattributed (summing to 100)", () => {
    const c = mirrorCoverage(38);
    expect(c.provablePercent).toBe(38);
    expect(c.unattributedPercent).toBe(62);
    expect(c.provablePercent + c.unattributedPercent).toBe(100);
  });

  it("flags a weak 'human' signal when the unattributed fraction dominates", () => {
    expect(mirrorCoverage(5).weakHumanSignal).toBe(true); // 95% unattributed → don't read as 'human'
    expect(mirrorCoverage(80).weakHumanSignal).toBe(false); // mostly provable AI
    expect(mirrorCoverage(50).weakHumanSignal).toBe(true); // tie counts as weak
  });

  it("rounds and clamps to [0,100]", () => {
    expect(mirrorCoverage(37.6).provablePercent).toBe(38);
    expect(mirrorCoverage(-3).provablePercent).toBe(0);
    expect(mirrorCoverage(150).provablePercent).toBe(100);
    expect(mirrorCoverage(150).unattributedPercent).toBe(0);
  });
});
