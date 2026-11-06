import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { evaluateRepoDisclosure } from "@madeby/analyzer";
import { clearMerges, declareMerges, installMergeHook, parseMergeValue } from "./merge-hook";

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const { GIT_EDITOR: _e, ...BASE } = process.env; // the session may set GIT_EDITOR, which would hide core.editor
const ENV = { ...BASE, GIT_AUTHOR_NAME: "Wren Ito", GIT_AUTHOR_EMAIL: "wren@example.com", GIT_COMMITTER_NAME: "Wren Ito", GIT_COMMITTER_EMAIL: "wren@example.com" };
const g = (d: string, ...a: string[]): string =>
  execFileSync("git", ["-C", d, "-c", "commit.gpgsign=false", "-c", "user.name=Wren Ito", "-c", "user.email=wren@example.com", ...a], { encoding: "utf8", env: ENV, stdio: ["ignore", "pipe", "pipe"] }).trim();
const tryG = (d: string, ...a: string[]): void => {
  try {
    g(d, ...a);
  } catch {
    /* a conflicting merge exits non-zero */
  }
};
const body = (d: string): string => g(d, "show", "-s", "--format=%B", "HEAD");

/** a repo with `main` and `task` that both changed a.txt (a conflict) and b.txt / c.txt (clean) */
function repo(): string {
  const d = mkdtempSync(join(tmpdir(), "madeby-hook-"));
  dirs.push(d);
  g(d, "init", "-q", "-b", "main");
  g(d, "config", "user.name", "Wren Ito");
  g(d, "config", "user.email", "wren@example.com");
  writeFileSync(join(d, "a.txt"), "base\n");
  g(d, "add", "-A");
  g(d, "commit", "-q", "-m", "base\n\nAuthored-by-human: Wren Ito <wren@example.com>");
  g(d, "checkout", "-q", "-b", "task");
  writeFileSync(join(d, "a.txt"), "task\n");
  writeFileSync(join(d, "b.txt"), "b\n");
  g(d, "add", "-A");
  g(d, "commit", "-q", "-m", "task\n\nAuthored-by-human: Wren Ito <wren@example.com>");
  g(d, "checkout", "-q", "main");
  writeFileSync(join(d, "a.txt"), "main\n");
  writeFileSync(join(d, "c.txt"), "c\n");
  g(d, "add", "-A");
  g(d, "commit", "-q", "-m", "main\n\nAuthored-by-human: Wren Ito <wren@example.com>");
  return d;
}
/** merge task into main, resolve the conflict by hand, and finish with `finish` */
function resolve(d: string, ...finish: string[]): void {
  tryG(d, "merge", "--no-edit", "task");
  writeFileSync(join(d, "a.txt"), "both\n");
  g(d, "add", "a.txt");
  g(d, "commit", "-q", ...finish);
}

describe("the merge hook (#227)", () => {
  it("adds the declared disclosure to a conflict resolution, and check counts it", () => {
    const d = repo();
    declareMerges(d, { category: "with_ai", tool: "Claude Code" });
    resolve(d, "--no-edit");
    expect(body(d)).toMatch(/^Authored-by-human: Wren Ito <wren@example.com>$/m);
    expect(body(d)).toMatch(/^Assisted-by: Claude Code$/m);
    const r = evaluateRepoDisclosure(d);
    expect(r.undisclosed).toEqual([]);
  });

  it("check marks an undisclosed conflict resolution as a merge", () => {
    const d = repo();
    resolve(d, "--no-edit");
    expect(evaluateRepoDisclosure(d).undisclosed).toEqual([{ ref: expect.any(String), subject: "Merge branch 'task'", merge: true }]);
  });

  it("also when the merge is finished with -m", () => {
    const d = repo();
    declareMerges(d, { category: "ai", tool: "Claude Code" });
    resolve(d, "-m", "Merge task into main");
    expect(body(d)).toMatch(/^Authored-by-ai: Claude Code$/m);
  });

  it("leaves a clean merge alone — it isn't scored", () => {
    const d = repo();
    g(d, "checkout", "-q", "-b", "clean", "task~1");
    writeFileSync(join(d, "d.txt"), "d\n");
    g(d, "add", "-A");
    g(d, "commit", "-q", "-m", "d\n\nAuthored-by-human: Wren Ito <wren@example.com>");
    declareMerges(d, { category: "human" });
    g(d, "merge", "-q", "--no-edit", "task");
    expect(body(d)).not.toMatch(/Authored-by-human/);
  });

  it("an existing disclosure in the message wins", () => {
    const d = repo();
    declareMerges(d, { category: "human" });
    resolve(d, "-m", "Merge task\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>");
    expect(body(d)).not.toMatch(/Authored-by-human/);
  });

  it("without a declaration: nothing when no editor opens, commented lines when one does", () => {
    const d = repo();
    installMergeHook(d);
    resolve(d, "--no-edit");
    expect(body(d)).not.toMatch(/Authored-by|Assisted-by/);

    const e = repo();
    installMergeHook(e);
    const seen = join(e, ".git", "seen-msg");
    const editor = join(e, ".git", "editor.sh");
    writeFileSync(editor, `#!/bin/sh\ncp "$1" "${seen}"\n`);
    chmodSync(editor, 0o755);
    tryG(e, "merge", "--no-edit", "task");
    writeFileSync(join(e, "a.txt"), "both\n");
    g(e, "add", "a.txt");
    g(e, "-c", `core.editor=${editor}`, "commit", "-q");
    expect(readFileSync(seen, "utf8")).toMatch(/^#Authored-by-human: Wren Ito <wren@example.com>$/m);
    expect(body(e)).not.toMatch(/Authored-by/); // still commented, so git strips it
  });

  it("runs an existing prepare-commit-msg hook first, and reinstalling doesn't chain itself", () => {
    const d = repo();
    const hook = join(d, ".git", "hooks", "prepare-commit-msg");
    writeFileSync(hook, `#!/bin/sh\necho ran >> "${join(d, ".git", "ran")}"\n`);
    chmodSync(hook, 0o755);
    expect(declareMerges(d, { category: "human" }).status).toBe("chained");
    expect(installMergeHook(d).status).toBe("chained");
    resolve(d, "--no-edit");
    expect(readFileSync(join(d, ".git", "ran"), "utf8").trim()).toBe("ran");
    expect(body(d)).toMatch(/^Authored-by-human: /m);
  });

  it("doesn't write into a folder a hook manager owns", () => {
    const d = repo();
    g(d, "config", "core.hooksPath", ".husky/_");
    const h = installMergeHook(d);
    expect(h.status).toBe("managed");
    expect(h.line).toContain("madeby/prepare-commit-msg");
    expect(existsSync(join(d, ".husky"))).toBe(false);
  });

  it("--merges off clears the declaration", () => {
    const d = repo();
    declareMerges(d, { category: "human" });
    clearMerges(d);
    resolve(d, "--no-edit");
    expect(body(d)).not.toMatch(/Authored-by-human/);
  });

  it("parses the config values it writes", () => {
    expect(parseMergeValue("human")).toEqual({ category: "human" });
    expect(parseMergeValue("with_ai:Cursor:claude-sonnet-5")).toEqual({ category: "with_ai", tool: "Cursor:claude-sonnet-5" });
    expect(parseMergeValue("nope")).toBeNull();
  });
});
