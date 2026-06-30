import { describe, it, expect } from "vitest";
import { validateCorrection, correctionToLabel, serializeCorrection, parseCorrection, type Correction } from "./feedback";

const NOW = "2026-06-30T00:00:00Z";

describe("validateCorrection", () => {
  it("accepts a well-formed correction and normalizes it", () => {
    const r = validateCorrection({ repo: " github.com/a/b ", kind: "wrong-ai-mix", correction: " I wrote it all ", note: " ctx " }, NOW);
    expect(r).toEqual({ repo: "github.com/a/b", kind: "wrong-ai-mix", correction: "I wrote it all", note: "ctx", at: NOW });
  });

  it("defaults an unknown kind to 'other' (never throws on junk)", () => {
    const r = validateCorrection({ repo: "a/b", kind: "🤖🤖", correction: "x" }, NOW);
    expect("error" in r ? null : r.kind).toBe("other");
  });

  it("rejects missing repo and missing correction", () => {
    expect(validateCorrection({ correction: "x" }, NOW)).toEqual({ error: "missing repo" });
    expect(validateCorrection({ repo: "a/b" }, NOW)).toEqual({ error: "tell us what's actually true" });
  });

  it("omits an empty note rather than storing a blank", () => {
    const r = validateCorrection({ repo: "a/b", kind: "other", correction: "x", note: "   " }, NOW) as Correction;
    expect("note" in r).toBe(false);
  });
});

describe("the triple duty: eval-label bridge + round-trip", () => {
  const c: Correction = { repo: "github.com/a/b", kind: "not-mine", correction: "wrong author", at: NOW };

  it("maps a correction to a labeled eval case (data-acquisition bridge)", () => {
    expect(correctionToLabel(c)).toEqual({ subject: "github.com/a/b", kind: "not-mine", truth: "wrong author", capturedAt: NOW });
  });

  it("serializes + parses as one JSONL line", () => {
    expect(parseCorrection(serializeCorrection(c))).toEqual(c);
    expect(parseCorrection("{ not json")).toBeNull();
  });
});
