import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { provenanceOf, provenanceMap } from "./path-provenance";
import { recordAiSpans } from "./record-spans";

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
    // capture a real witnessed span for math.ts (transcript path uses `root`, matching recordAiSpans's repoRoot)
    const log = join(root, "s.jsonl");
    writeFileSync(log, JSON.stringify({ type: "assistant", message: { model: "claude-opus-4-8", content: [{ type: "tool_use", name: "Write", input: { file_path: join(root, "math.ts"), content: AI_SRC } }] } }) + "\n");
    expect(recordAiSpans(root, { transcriptPath: log }).written).toBe(true);

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

describe("provenanceMap — the repo-wide orientation", () => {
  it("maps the witnessed AI surface + commit coverage; never asserts 'human'", () => {
    const root = tmp("madeby-map-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "math.ts"), AI_SRC);
    writeFileSync(join(root, "plain.ts"), "export const x = 1;\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "feat: math\n\nCo-Authored-By: Claude <noreply@anthropic.com>");
    const log = join(root, "s.jsonl");
    writeFileSync(log, JSON.stringify({ type: "assistant", message: { model: "claude-opus-4-8", content: [{ type: "tool_use", name: "Write", input: { file_path: join(root, "math.ts"), content: AI_SRC } }] } }) + "\n");
    expect(recordAiSpans(root, { transcriptPath: log }).written).toBe(true);

    const map = provenanceMap(root);
    expect(map.trackedFiles).toBeGreaterThanOrEqual(2);
    expect(map.witnessedFiles).toBe(1);
    const m = map.witnessed.find((w) => w.path === "math.ts");
    expect(m?.models).toContain("claude-opus-4-8");
    expect(map.witnessed.some((w) => w.path === "plain.ts")).toBe(false); // no span → not on the witnessed surface
    expect(map.commitCoverage.disclosed).toBe(1);
    expect(JSON.stringify(map)).not.toMatch(/\bhuman\b/i);
  });

  it("scopes to a path prefix and never throws outside git", () => {
    const root = tmp("madeby-map2-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "keep.ts"), "1\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "add");
    const scoped = provenanceMap(root, { prefix: "does-not-exist/" });
    expect(scoped.trackedFiles).toBe(0);
    expect(scoped.witnessed).toEqual([]);
  });
});

describe("SPDX-AI-Disclosure — recognized as a carrier (ACO §5)", () => {
  it("surfaces a file-header tag as a disclosed 'header' record (with model)", () => {
    const root = tmp("madeby-spdxai-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "gen.ts"), "// SPDX-AI-Disclosure: ai-generated\n// SPDX-AI-Model: claude-opus-4-6\nexport const x = 1;\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "add gen.ts");
    const header = provenanceOf(root, "gen.ts").records.find((r) => r.source === "header");
    expect(header).toMatchObject({ source: "header", granularity: "file", ai: true, confidence: "disclosed", model: "claude-opus-4-6" });
    expect(header?.disclosures).toContain("spdx-ai-disclosure");
    expect(header?.evidence).toContain("ai-generated");
  });

  it("treats `none` as a human disclosure (ai:false)", () => {
    const root = tmp("madeby-spdxnone-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "h.ts"), "// SPDX-AI-Disclosure: none\nexport const y = 2;\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "add h.ts");
    const header = provenanceOf(root, "h.ts").records.find((r) => r.source === "header");
    expect(header).toMatchObject({ source: "header", ai: false });
  });

  it("reads the repo-level AI_DISCLOSURE.md default into the provenance map", () => {
    const root = tmp("madeby-spdxdef-");
    git(root, "init", "-q", "-b", "main");
    writeFileSync(join(root, "AI_DISCLOSURE.md"), "---\ndisclosure-default: ai-assisted\n---\n");
    writeFileSync(join(root, "a.ts"), "export const z = 3;\n");
    git(root, "add", "-A");
    git(root, "commit", "--no-verify", "-m", "init");
    expect(provenanceMap(root, {}).aiDisclosureDefault).toMatchObject({ value: "ai-assisted", category: "with_ai" });
  });
});
