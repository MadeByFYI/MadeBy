import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { repoCoverage } from "@madeby/analyzer";
import { affirmAuthorship, aiValue, attestAiAuthorship, disclosureTrailers, parseModel } from "./me";

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

describe("the model in a repo that records it — the tool's record wins over the agent's own --model", () => {
  const cursorEnv = { CURSOR_AGENT: "1", CURSOR_MODEL: "composer-2-fast" };
  const recording = (): string => {
    const d = tmpRepo();
    mkdirSync(join(d, ".madeby"), { recursive: true });
    writeFileSync(join(d, ".madeby", "policy.json"), JSON.stringify({ version: 0, mode: "advisory", recordModel: true }));
    return d;
  };

  it("fills the model from Cursor's environment when the agent names only the tool", () => {
    const d = recording();
    const r = affirmAuthorship(d, { withAi: true, tool: "Cursor", env: cursorEnv });
    expect(r).toMatchObject({ model: "composer-2-fast", modelSource: "Cursor's CURSOR_MODEL" });
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/^Assisted-by: Cursor:composer-2-fast$/m);
  });

  it("overrides an agent's guessed --model with the tool's record", () => {
    const d = recording();
    attestAiAuthorship(d, { tool: "Cursor", model: "composer-2", env: cursorEnv });
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/^Authored-by-ai: Cursor:composer-2-fast$/m);
  });

  it("reads nothing in a repo that doesn't record the model — the project's choice", () => {
    const d = tmpRepo();
    const r = affirmAuthorship(d, { withAi: true, tool: "Cursor", env: cursorEnv });
    expect(r.model).toBeUndefined();
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/^Assisted-by: Cursor$/m);
  });

  it("falls back to the agent's --model where the tool keeps no record", () => {
    const d = recording();
    const r = attestAiAuthorship(d, { tool: "Aider", model: "gpt-5.2", env: {} });
    expect(r).toMatchObject({ model: "gpt-5.2", modelSource: "as given (--model)" });
  });
});

describe("an empty commit can be disclosed too", () => {
  it("amends an --allow-empty commit's message without failing", () => {
    const d = tmpRepo();
    git(d, "commit", "--allow-empty", "--no-verify", "-q", "-m", "chore: empty");
    expect(attestAiAuthorship(d, { tool: "Cursor" }).ok).toBe(true);
    expect(git(d, "show", "-s", "--format=%B", "HEAD")).toMatch(/^Authored-by-ai: Cursor$/m);
  });
});

describe("--print — the disclosure for the commit message itself (platforms that make the commit)", () => {
  it("returns trailer lines and leaves HEAD untouched", () => {
    const d = tmpRepo();
    const before = git(d, "rev-parse", "HEAD");
    expect(disclosureTrailers(d, { category: "ai", tool: "GitHub Copilot", model: "gpt-6-luna" }).lines).toEqual(["Authored-by-ai: GitHub Copilot:gpt-6-luna"]);
    expect(disclosureTrailers(d, { category: "with_ai", tool: "Cursor" }).lines).toEqual(["Authored-by-human: Dev <dev@example.com>", "Assisted-by: Cursor"]);
    expect(disclosureTrailers(d, { category: "human" }).lines).toEqual(["Authored-by-human: Dev <dev@example.com>"]);
    expect(git(d, "rev-parse", "HEAD")).toBe(before);
  });

  it("uses the tool's record for the model, like the amending path", () => {
    const d = tmpRepo();
    mkdirSync(join(d, ".madeby"), { recursive: true });
    writeFileSync(join(d, ".madeby", "policy.json"), JSON.stringify({ version: 0, mode: "advisory", recordModel: true }));
    const t = disclosureTrailers(d, { category: "ai", tool: "Cursor", env: { CURSOR_AGENT: "1", CURSOR_MODEL: "composer-2-fast" } });
    expect(t).toMatchObject({ lines: ["Authored-by-ai: Cursor:composer-2-fast"], modelSource: "Cursor's CURSOR_MODEL" });
  });

  it("as a commit message's last paragraph, git and coverage read it", () => {
    const d = tmpRepo();
    writeFileSync(join(d, "y.txt"), "y\n");
    git(d, "add", "-A");
    const lines = disclosureTrailers(d, { category: "ai", tool: "GitHub Copilot", model: "gpt-6-luna" }).lines.join("\n");
    git(d, "commit", "--no-verify", "-q", "-m", "feat: y", "-m", lines);
    expect(git(d, "log", "-1", "--format=%(trailers:key=Authored-by-ai,valueonly)").trim()).toBe("GitHub Copilot:gpt-6-luna");
    expect(repoCoverage(d).byAgent).toEqual([{ name: "GitHub Copilot · gpt-6-luna", provider: "github-copilot", tool: "GitHub Copilot", model: "gpt-6-luna", commits: 1 }]);
  });
});
