import { describe, it, expect } from "vitest";
import { readGitLog } from "./git";

describe("readGitLog", () => {
  it("returns an array of well-formed commits (or [] when git/repo is unavailable)", () => {
    const commits = readGitLog(process.cwd());
    expect(Array.isArray(commits)).toBe(true);
    // Robust to shallow clones / no-git environments: only assert shape when present.
    if (commits.length > 0) {
      const c = commits[0]!;
      expect(typeof c.message).toBe("string");
      expect(typeof c.authorName).toBe("string");
      expect(typeof c.authorEmail).toBe("string");
    }
  });

  it("never throws on a non-existent path (degrades to [])", () => {
    expect(readGitLog("/no/such/repo/path")).toEqual([]);
  });
});
