import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { affirmAuthorship } from "./me";

const dirs: string[] = [];
const git = (dir: string, ...a: string[]): string =>
  execFileSync("git", ["-C", dir, "-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const tmpRepo = (): string => {
  const d = mkdtempSync(join(tmpdir(), "madeby-affirm-"));
  dirs.push(d);
  git(d, "init", "-q", "-b", "main");
  git(d, "config", "user.name", "Dev");
  git(d, "config", "user.email", "dev@example.com");
  git(d, "config", "commit.gpgsign", "false");
  writeFileSync(join(d, "x.txt"), "hi\n");
  git(d, "add", "-A");
  git(d, "commit", "--no-verify", "-m", "feat: work");
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("affirmAuthorship — the shared `me` / MCP `disclose` mechanic", () => {
  it("human: adds Authored-by-human, classifies human", () => {
    const d = tmpRepo();
    const r = affirmAuthorship(d);
    expect(r).toMatchObject({ ok: true, changed: true, category: "human" });
    expect(r.added).toEqual(["Authored-by-human"]);
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/Authored-by-human: Dev <dev@example.com>/);
  });

  it("with_ai: adds Authored-by-human + Assisted-by, classifies with_ai", () => {
    const d = tmpRepo();
    const r = affirmAuthorship(d, { withAi: true, tool: "Claude Code" });
    expect(r).toMatchObject({ ok: true, changed: true, category: "with_ai" });
    expect(r.added).toEqual(expect.arrayContaining(["Authored-by-human", "Assisted-by"]));
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/Assisted-by: Claude Code/);
  });

  it("is idempotent — re-running makes no change and never duplicates a trailer", () => {
    const d = tmpRepo();
    affirmAuthorship(d, { withAi: true, tool: "X" });
    const r2 = affirmAuthorship(d, { withAi: true, tool: "X" });
    expect(r2).toMatchObject({ ok: true, changed: false });
    expect(r2.added).toEqual([]);
    expect((git(d, "show", "-s", "--format=%B", "HEAD").match(/Authored-by-human/g) ?? []).length).toBe(1);
  });

  it("refuses when the index has staged changes (affirms HEAD, not the index)", () => {
    const d = tmpRepo();
    writeFileSync(join(d, "y.txt"), "staged\n");
    git(d, "add", "y.txt");
    expect(affirmAuthorship(d)).toMatchObject({ ok: false, reason: "staged-changes" });
  });
});
