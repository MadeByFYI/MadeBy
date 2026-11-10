import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasAuthoredMerge, readGitLog } from "./git";

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

describe("hasAuthoredMerge (#238)", () => {
  it("pages past clean merges to an older conflict resolution, and says no when there is none", () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-gitmerge-"));
    try {
      const git = (...args: string[]) => {
        try {
          execFileSync("git", ["-C", dir, "-c", "user.name=W", "-c", "user.email=w@example.com", "-c", "commit.gpgsign=false", ...args], { stdio: "ignore" });
        } catch {
          /* a conflicting merge exits non-zero */
        }
      };
      const commit = (file: string, text: string, msg: string) => {
        writeFileSync(join(dir, file), text);
        git("add", "-A");
        git("commit", "-q", "-m", msg);
      };
      // a clean merge: a branch that touched its own file
      const cleanMerge = (n: number) => {
        git("checkout", "-q", "-b", `b${n}`);
        commit(`f${n}.txt`, `${n}\n`, `f${n}`);
        git("checkout", "-q", "main");
        commit(`m${n}.txt`, `${n}\n`, `m${n}`);
        git("merge", "-q", "--no-edit", `b${n}`);
      };
      git("init", "-q", "-b", "main");
      commit("a.txt", "base\n", "base");
      for (let n = 0; n < 3; n++) cleanMerge(n);
      expect(hasAuthoredMerge(dir, 0, 2)).toBe(false);

      // the oldest-to-be-read merge resolves a conflict, then more clean merges on top
      git("checkout", "-q", "-b", "task");
      commit("a.txt", "task\n", "task");
      git("checkout", "-q", "main");
      commit("a.txt", "main\n", "main");
      git("merge", "-q", "--no-edit", "task");
      writeFileSync(join(dir, "a.txt"), "both\n");
      git("commit", "-qam", "merge task");
      for (let n = 3; n < 8; n++) cleanMerge(n);
      expect(hasAuthoredMerge(dir, 0, 2)).toBe(true);
      expect(hasAuthoredMerge(dir, Math.floor(Date.now() / 1000) + 3600, 2)).toBe(false); // nothing since
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
