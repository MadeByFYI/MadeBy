import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { proveRepo } from "./prove";

const dirs: string[] = [];
const AI_SRC = "export function add(a, b) {\n  return a + b;\n}\n";

function git(dir: string, ...args: string[]): string {
  return execFileSync("git", ["-C", dir, "-c", "user.name=T", "-c", "user.email=t@e.com", "-c", "commit.gpgsign=false", ...args], { encoding: "utf8" }).trim();
}

// A repo with math.ts committed + a Claude Code transcript that "wrote" `fileContent` to it.
function setup(fileContent: string): { root: string; transcript: string } {
  const root = mkdtempSync(join(tmpdir(), "madeby-prove-"));
  dirs.push(root);
  git(root, "init", "-q", "-b", "main");
  writeFileSync(join(root, "math.ts"), fileContent);
  git(root, "add", "-A");
  git(root, "commit", "--no-verify", "-m", "add math");
  const transcript = join(root, "session.jsonl");
  writeFileSync(
    transcript,
    JSON.stringify({ type: "assistant", message: { model: "claude-opus-4-8", content: [{ type: "tool_use", name: "Write", input: { file_path: join(root, "math.ts"), content: AI_SRC } }] } }) + "\n",
  );
  return { root, transcript };
}
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("proveRepo — records only structurally-present AI spans (asserted, local)", () => {
  it("writes .madeby/spans when the AI content is present in the checkout", () => {
    const { root, transcript } = setup(AI_SRC);
    const r = proveRepo(root, { transcriptPath: transcript, now: "2026-06-30T00:00:00Z" });
    expect(r.written).toBe(true);
    expect(r.matched).toBe(1);
    expect(existsSync(r.path!)).toBe(true);
    const manifest = JSON.parse(readFileSync(r.path!, "utf8")) as { attestations: { attribution: { source: string; model: string } }[] };
    expect(manifest.attestations).toHaveLength(1);
    expect(manifest.attestations[0]!.attribution.source).toBe("claude-code-session-log");
    expect(manifest.attestations[0]!.attribution.model).toBe("claude-opus-4-8");
  });

  it("records NOTHING when the AI content is not present (honest discard)", () => {
    const { root, transcript } = setup("a poem about the sea, nothing like the code\n");
    const r = proveRepo(root, { transcriptPath: transcript, now: "2026-06-30T00:00:00Z" });
    expect(r.written).toBe(false);
    expect(r.matched).toBe(0);
    expect(r.discarded).toBe(1);
  });

  it("returns a transcript-not-found error, never throws", () => {
    const { root } = setup(AI_SRC);
    const r = proveRepo(root, { transcriptPath: join(root, "nope.jsonl") });
    expect(r.written).toBe(false);
    expect(r.error).toBe("transcript-not-found");
  });
});
