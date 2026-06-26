import { describe, it, expect } from "vitest";
import { runConformance, CONFORMANCE_VERSION } from "./conformance";

describe("conformance vectors (publishable artifact)", () => {
  it("our implementation passes every frozen vector", async () => {
    const results = await runConformance();
    const failures = results.filter((r) => !r.pass);
    // Surface any failure with its category/name/detail
    expect(failures, JSON.stringify(failures, null, 2)).toHaveLength(0);
    expect(results.length).toBeGreaterThan(10);
  });

  it("exposes a version (frozen set is versioned)", () => {
    expect(CONFORMANCE_VERSION).toBe("0");
  });

  it("includes adversarial negatives across categories", async () => {
    const results = await runConformance();
    const adversarial = results.filter((r) => /ADVERSARIAL/i.test(r.name));
    expect(adversarial.length).toBeGreaterThanOrEqual(4);
    expect(adversarial.every((r) => r.pass)).toBe(true);
  });
});
