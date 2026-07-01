import { describe, it, expect } from "vitest";
import { mirrorCoverage } from "./coverage";

describe("mirrorCoverage — three-way honest split, never a confident 'human' ratio", () => {
  it("splits provable-AI / human-attributed / fully-unattributed (summing to 100)", () => {
    const c = mirrorCoverage(38, 0);
    expect(c.provableAiPercent).toBe(38);
    expect(c.humanAttributedPercent).toBe(62); // named humans, AI unknown — NOT "can't see"
    expect(c.fullyUnattributedPercent).toBe(0);
    expect(c.provableAiPercent + c.humanAttributedPercent + c.fullyUnattributedPercent).toBe(100);
  });

  it("carves out genuinely author-less commits as fully-unattributed", () => {
    const c = mirrorCoverage(20, 10); // 20% provable AI, 10% author-less
    expect(c.provableAiPercent).toBe(20);
    expect(c.fullyUnattributedPercent).toBe(10);
    expect(c.humanAttributedPercent).toBe(70);
  });

  it("flags a weak 'human' signal when most of the repo isn't provably AI", () => {
    expect(mirrorCoverage(5, 0).weakHumanSignal).toBe(true);
    expect(mirrorCoverage(80, 0).weakHumanSignal).toBe(false);
    expect(mirrorCoverage(50, 0).weakHumanSignal).toBe(false); // exactly 50% provable → not weak
    expect(mirrorCoverage(49, 0).weakHumanSignal).toBe(true);
  });

  it("rounds and clamps; the three parts never exceed 100", () => {
    const c = mirrorCoverage(37.6, 200); // absurd unattributed clamps under the AI remainder
    expect(c.provableAiPercent).toBe(38);
    expect(c.fullyUnattributedPercent).toBe(62);
    expect(c.humanAttributedPercent).toBe(0);
    expect(c.provableAiPercent + c.humanAttributedPercent + c.fullyUnattributedPercent).toBe(100);
  });
});
