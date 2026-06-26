import { describe, it, expect } from "vitest";
import { structuralFingerprint, cosineSimilarity } from "./structural";

const original = `function add(a, b) {\n  return a + b;\n}\n`;
// same logic, reformatted: a comment added, whitespace/indentation changed
const reformatted = `// adds two numbers\nfunction add(a,b){\n\n        return a + b ;\n}`;
const renamed = `function sum(x, y) { return x + y; }`;
const unrelated = `class Widget { render() { return this.props.title.toUpperCase(); } }`;

const emb = (s: string) => structuralFingerprint(s).embedding;

describe("structural fingerprint", () => {
  it("matches reformatted code (whitespace/comments) with high similarity", () => {
    expect(cosineSimilarity(emb(original), emb(reformatted))).toBeGreaterThan(0.85);
  });

  it("distinguishes unrelated code", () => {
    expect(cosineSimilarity(emb(original), emb(unrelated))).toBeLessThan(0.5);
  });

  it("matches renamed code (identifier normalization ignores names)", () => {
    // identifiers are canonicalized, so add/sum and a/b/x/y don't affect the fingerprint
    expect(cosineSimilarity(emb(original), emb(renamed))).toBeGreaterThan(0.85);
  });

  it("produces a native, structural (non-exact) fingerprint", () => {
    const fp = structuralFingerprint(original).fingerprint;
    expect(fp.algorithm).toBe("structural-v1");
    expect(fp.value.length).toBeGreaterThan(0);
  });
});
