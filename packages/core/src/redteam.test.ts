import { describe, it, expect } from "vitest";
import { runRedTeam } from "./redteam";

describe("red-team harness — the trust core resists every coded attack", () => {
  const results = runRedTeam();

  it("runs a meaningful number of attacks", () => {
    expect(results.length).toBeGreaterThanOrEqual(8);
  });

  it("every attack is resisted (each is the safe outcome)", () => {
    const breached = results.filter((r) => !r.resisted);
    expect(breached, JSON.stringify(breached, null, 2)).toHaveLength(0);
  });

  it("covers escalation, two-hash, signature-binding, and carrier degradation", () => {
    const cats = new Set(results.map((r) => r.category));
    expect(cats).toContain("tier-escalation");
    expect(cats).toContain("two-hash-invariant");
    expect(cats).toContain("signature-binding");
    expect(cats).toContain("carrier-degradation");
  });
});
