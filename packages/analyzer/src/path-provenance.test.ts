import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { provenanceOf } from "./path-provenance";
import { proveRepo } from "./prove";

const dirs: string[] = [];
const AI_SRC = "export function add(a, b) {\n  return a + b;\n}\n";
const git = (dir: string, ...a: string[]): string =>
  execFileSync("git", ["-C", dir, "-c", "user.name=T", "-c", "user.email=t@e.com", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const tmp = (p: string): string => {
  const d = mkdtempSync(join(tmpdir(), p));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("provenanceOf — the agent-context read", () => {
  it("returns a witnessed AI span (model) plus last-touch commit disclosure for a path", () => {
    const root = tmp("madeby-prov-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "math.ts"), AI_SRC);
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "feat: math\n\nCo-Authored-By: Claude <noreply@anthropic.com>");
    // capture a real witnessed span for math.ts (transcript path uses `root`, matching proveRepo's repoRoot)
    const log = join(root, "s.jsonl");
    writeFileSync(log, JSON.stringify({ type: "assistant", message: { model: "claude-opus-4-8", content: [{ type: "tool_use", name: "Write", input: { file_path: join(root, "math.ts"), content: AI_SRC } }] } }) + "\n");
    expect(proveRepo(root, { transcriptPath: log }).written).toBe(true);

    const p = provenanceOf(root, "math.ts");
    const span = p.records.find((r) => r.source === "span");
    expect(span?.ai).toBe(true);
    expect(span?.model).toBe("claude-opus-4-8");
    expect(span?.confidence).toBe("witnessed");
    const blame = p.records.find((r) => r.source === "blame");
    expect(blame?.confidence).toBe("disclosed"); // the touching commit carried an AI trailer
    expect(blame?.ai).toBe(true);
  });

  it("labels an undisclosed last-touch commit as unknown, and never asserts 'human'", () => {
    const root = tmp("madeby-prov2-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "plain.ts"), "export const x = 1;\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "add plain"); // no disclosure

    const p = provenanceOf(root, "plain.ts");
    expect(p.records.some((r) => r.source === "span")).toBe(false);
    const blame = p.records.find((r) => r.source === "blame");
    expect(blame?.confidence).toBe("none");
    expect(blame?.ai).toBe(false);
    expect(JSON.stringify(p)).not.toMatch(/\bhuman\b/i); // disclosure, not detection — never asserts human
  });

  it("scopes to a line range, and degrades to no records for an unknown path (never throws)", () => {
    const root = tmp("madeby-prov3-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "a.ts"), "one\ntwo\nthree\nfour\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "add a");
    const ranged = provenanceOf(root, "a.ts", { startLine: 2, endLine: 3 });
    expect(ranged.records.every((r) => (r.endLine ?? 0) >= 2 && (r.startLine ?? 99) <= 3)).toBe(true);
    expect(provenanceOf(root, "nope.ts").records).toEqual([]);
  });
});
