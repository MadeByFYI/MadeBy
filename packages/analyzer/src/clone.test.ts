import { describe, it, expect } from "vitest";
import { normalizeRepoUrl, isAnalyzeError } from "./clone";

describe("normalizeRepoUrl — lenient on shape, strict on safety", () => {
  it("normalizes the common shapes to a clean clone URL", () => {
    const want = "https://github.com/MacDougherty/MadeBy.git";
    for (const input of [
      "https://github.com/MacDougherty/MadeBy",
      "https://github.com/MacDougherty/MadeBy.git",
      "https://github.com/MacDougherty/MadeBy/",
      "github.com/MacDougherty/MadeBy", // bare host — prepend https
      "https://github.com/MacDougherty/MadeBy/tree/main/packages", // deep link → owner/repo
    ]) {
      expect(normalizeRepoUrl(input), input).toBe(want);
    }
  });

  it("accepts the other allowlisted hosts", () => {
    expect(normalizeRepoUrl("https://gitlab.com/a/b")).toBe("https://gitlab.com/a/b.git");
    expect(normalizeRepoUrl("https://codeberg.org/a/b")).toBe("https://codeberg.org/a/b.git");
  });

  it("rejects anything not an allowlisted public https repo (SSRF / injection guards)", () => {
    for (const bad of [
      "",
      "   ",
      "http://github.com/a/b", // not https
      "https://evil.com/a/b", // host not allowed
      "https://user:pass@github.com/a/b", // userinfo
      "https://github.com/onlyowner", // no repo
      "https://github.com/", // no path
      "file:///etc/passwd",
      "ssh://git@github.com/a/b",
      "https://localhost/a/b",
      "https://169.254.169.254/a/b", // cloud metadata
      "not a url at all !!",
      "https://github.com/a b/c", // space in name
    ]) {
      expect(normalizeRepoUrl(bad), bad).toBeNull();
    }
  });

  it("path traversal can't escape the allowlisted host", () => {
    // `..` is resolved by URL normalization, so it stays on github.com (a benign 404), never off-host.
    const r = normalizeRepoUrl("https://github.com/../../etc/passwd");
    expect(r === null || r!.startsWith("https://github.com/")).toBe(true);
  });

  it("isAnalyzeError narrows the result union", () => {
    expect(isAnalyzeError({ error: "x" })).toBe(true);
  });
});
