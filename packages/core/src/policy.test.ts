import { describe, it, expect } from "vitest";
import {
  DEFAULT_POLICY,
  parseDisclosurePolicy,
  evaluateDisclosurePolicy,
  type CommitDisclosure,
} from "./policy";

describe("parseDisclosurePolicy — fail-safe normalization", () => {
  it("reads a well-formed policy", () => {
    expect(parseDisclosurePolicy({ version: 0, mode: "required", accept: ["dco-signoff"] })).toEqual({
      version: 0,
      mode: "required",
      accept: ["dco-signoff"],
    });
  });
  it("degrades unknown/garbage input to the safe 'advisory' default (never invents a stricter gate)", () => {
    expect(DEFAULT_POLICY.mode).toBe("advisory"); // the floor is report-only, not silence
    expect(parseDisclosurePolicy(null)).toEqual(DEFAULT_POLICY);
    expect(parseDisclosurePolicy("nope")).toEqual(DEFAULT_POLICY);
    expect(parseDisclosurePolicy({ mode: "banhammer" })).toEqual({ version: 0, mode: "advisory" });
    expect(parseDisclosurePolicy({ mode: "off" })).toEqual({ version: 0, mode: "advisory" }); // "off" is gone → advisory
  });
  it("drops an empty accept list (⇒ any recognized disclosure counts)", () => {
    expect(parseDisclosurePolicy({ mode: "required", accept: [] })).toEqual({ version: 0, mode: "required" });
  });
});

const c = (ref: string, kinds: CommitDisclosure["kinds"]): CommitDisclosure => ({ ref, kinds });

describe("evaluateDisclosurePolicy", () => {
  const commits = [c("a", ["dco-signoff"]), c("b", ["commit-signature"]), c("d", [])];

  it("required: any accepted disclosure makes a commit compliant; undisclosed fails the gate", () => {
    const r = evaluateDisclosurePolicy({ version: 0, mode: "required" }, commits);
    expect(r.compliant).toBe(2);
    expect(r.nonCompliant.map((v) => v.ref)).toEqual(["d"]);
    expect(r.pass).toBe(false); // 'd' discloses nothing → required gate fails
  });

  it("required with a specific accept list only counts those kinds", () => {
    const r = evaluateDisclosurePolicy({ version: 0, mode: "required", accept: ["dco-signoff"] }, commits);
    expect(r.compliant).toBe(1); // only 'a' has a DCO sign-off
    expect(r.pass).toBe(false);
  });

  it("advisory reports the same picture but always passes the gate", () => {
    const r = evaluateDisclosurePolicy({ version: 0, mode: "advisory" }, commits);
    expect(r.nonCompliant.map((v) => v.ref)).toEqual(["d"]);
    expect(r.pass).toBe(true); // advisory never blocks
  });

  it("the default policy is advisory — reports coverage, never blocks", () => {
    const r = evaluateDisclosurePolicy(DEFAULT_POLICY, commits);
    expect(r.mode).toBe("advisory");
    expect(r.pass).toBe(true);
    expect(r.summary).toMatch(/disclose origin \(advisory/i);
  });

  it("an empty commit set passes (nothing to gate)", () => {
    expect(evaluateDisclosurePolicy({ version: 0, mode: "required" }, []).pass).toBe(true);
  });
});
