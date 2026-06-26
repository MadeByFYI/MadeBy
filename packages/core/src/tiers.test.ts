import { describe, it, expect } from "vitest";
import { TRUST_TIERS, compareTiers, FALLBACK_TIER } from "./tiers";

describe("trust tiers", () => {
  it("are ordered ascending: asserted < sworn < verified < bound", () => {
    expect(TRUST_TIERS).toEqual(["asserted", "sworn", "verified", "bound"]);
    expect(compareTiers("bound", "asserted")).toBeGreaterThan(0);
    expect(compareTiers("asserted", "verified")).toBeLessThan(0);
    expect(compareTiers("sworn", "sworn")).toBe(0);
  });
  it("the fail-safe fallback is the floor", () => {
    expect(FALLBACK_TIER).toBe("asserted");
    for (const t of TRUST_TIERS) expect(compareTiers(FALLBACK_TIER, t)).toBeLessThanOrEqual(0);
  });
});
