import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  // Regression: the field separator must not be NUL — Node's execFileSync rejects NUL bytes in
  // args, which silently turned every readGitLog into []. This hermetic repo catches that.
  it("parses real commits from a throwaway repo (separator is execFile-safe)", () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-gittest-"));
    try {
      const git = (...args: string[]) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
      git("init", "-q");
      // Set committer identity in-repo so the commit works in CI (no global git config there).
      git("config", "user.email", "mac@madeby.fyi");
      git("config", "user.name", "Mac");
      git(
        "commit",
        "--allow-empty",
        "-q",
        "-m",
        "First commit\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
        "--author=Mac <mac@madeby.fyi>",
      );
      const commits = readGitLog(dir);
      expect(commits.length).toBe(1);
      expect(commits[0]!.authorName).toBe("Mac");
      expect(commits[0]!.authorEmail).toBe("mac@madeby.fyi");
      expect(commits[0]!.message).toContain("Co-Authored-By: Claude");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
