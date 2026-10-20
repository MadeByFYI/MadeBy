import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { repoCoverage } from "@madeby/analyzer";
import { affirmAuthorship, aiValue, attestAiAuthorship, parseModel } from "./me";

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

describe("attestAiAuthorship — the log-free `ai` disclosure (Authored-by-ai)", () => {
  it("adds Authored-by-ai, classifies ai, and does NOT claim human authorship", () => {
    const d = tmpRepo();
    const r = attestAiAuthorship(d, { tool: "Claude Code" });
    expect(r).toMatchObject({ ok: true, changed: true, category: "ai" });
    expect(r.added).toEqual(["Authored-by-ai"]);
    const msg = git(d, "show", "-s", "--format=%B", "HEAD");
    expect(msg).toMatch(/Authored-by-ai: Claude Code/);
    expect(msg).not.toMatch(/Authored-by-human/);
  });

  it("defaults the tool to AI and is idempotent", () => {
    const d = tmpRepo();
    attestAiAuthorship(d);
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/Authored-by-ai: AI/);
    expect(attestAiAuthorship(d, { tool: "AI" })).toMatchObject({ ok: true, changed: false });
  });

  it("refuses when the index has staged changes", () => {
    const d = tmpRepo();
    writeFileSync(join(d, "z.txt"), "staged\n");
    git(d, "add", "z.txt");
    expect(attestAiAuthorship(d)).toMatchObject({ ok: false, reason: "staged-changes" });
  });
});

describe("--model — the agent AND the model version it ran (tool:model)", () => {
  it("with_ai + model writes Assisted-by: <tool>:<model>, which classifies with the pairing", () => {
    const d = tmpRepo();
    affirmAuthorship(d, { withAi: true, tool: "Cursor", model: "claude-sonnet-5" });
    const msg = git(d, "show", "-s", "--format=%B", "HEAD");
    expect(msg).toMatch(/^Assisted-by: Cursor:claude-sonnet-5$/m);
    const r = repoCoverage(d);
    expect(r.byCategory.with_ai).toBe(1);
    expect(r.byAgent).toEqual([{ name: "Cursor · claude-sonnet-5", provider: "cursor", tool: "Cursor", model: "claude-sonnet-5", commits: 1 }]);
  });

  it("ai + model writes Authored-by-ai: <tool>:<model>", () => {
    const d = tmpRepo();
    attestAiAuthorship(d, { tool: "Claude Code", model: "Claude Opus 5.5" });
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/^Authored-by-ai: Claude Code:Claude Opus 5\.5$/m);
  });

  it("a newline can't forge another trailer, and a colon in the tool can't mis-split it", () => {
    expect(aiValue("Cursor\nAuthored-by-human: Someone", "x")).toBe("Cursor Authored-by-human Someone:x");
    expect(aiValue("Cursor", "a\nb")).toBe("Cursor:a b");
    expect(aiValue("", "claude-sonnet-5")).toBe("AI:claude-sonnet-5");
    expect(aiValue("Cursor")).toBe("Cursor");
  });

  it("parseModel reads --model <v> and --model=<v>", () => {
    expect(parseModel(["--with-ai", "Cursor", "--model", "claude-sonnet-5"])).toBe("claude-sonnet-5");
    expect(parseModel(["--model=gpt-5"])).toBe("gpt-5");
    expect(parseModel(["--with-ai", "Cursor"])).toBeUndefined();
  });
});
