import { describe, it, expect } from "vitest";
import { captureLocalSpans } from "./capture-local";

const ROOT = "/repo";
const NOW = "2026-06-30T00:00:00Z";

// Build a minimal Claude Code transcript line: an assistant Write of `content` to `path`.
function write(path: string, content: string, model = "claude-opus-4-8"): string {
  return JSON.stringify({
    type: "assistant",
    message: { model, content: [{ type: "tool_use", name: "Write", input: { file_path: `${ROOT}/${path}`, content } }] },
  });
}

const AI_SRC = "export function add(a, b) {\n  return a + b;\n}\n";

describe("captureLocalSpans — witnessed, structurally-matched, honest", () => {
  it("attests a file whose committed content structurally matches what the AI wrote", () => {
    const transcript = write("src/math.ts", AI_SRC);
    const r = captureLocalSpans({
      transcript,
      repoRoot: ROOT,
      readFile: (rel) => (rel === "src/math.ts" ? AI_SRC : null),
      commit: "abc",
      operatorId: "mac@madeby.fyi",
      now: NOW,
    });
    expect(r.matched).toEqual(["src/math.ts"]);
    expect(r.manifest.attestations).toHaveLength(1);
    const a = r.manifest.attestations[0]!;
    expect(a.attribution.source).toBe("claude-code-session-log");
    expect(a.attribution.model).toBe("claude-opus-4-8");
    expect(a.anchor.fingerprint.algorithm).toBe("structural-v1"); // durable anchor, not blob-SHA
    expect(a.anchor.hint?.path).toBe("src/math.ts");
  });

  it("still matches after reformatting (structural fingerprint survives whitespace/comment churn)", () => {
    const reformatted = "// added by hand\nexport function add( a , b ){ return a+b }\n";
    const r = captureLocalSpans({
      transcript: write("src/math.ts", AI_SRC),
      repoRoot: ROOT,
      readFile: () => reformatted,
      commit: "abc",
      operatorId: "mac@madeby.fyi",
      now: NOW,
    });
    expect(r.matched).toEqual(["src/math.ts"]);
  });

  it("does NOT attest AI work that isn't present in the committed file (discarded, honestly)", () => {
    const r = captureLocalSpans({
      transcript: write("src/math.ts", AI_SRC),
      repoRoot: ROOT,
      readFile: () => "totally different file: a poem about the sea, nothing like the code\n",
      commit: "abc",
      operatorId: "mac@madeby.fyi",
      now: NOW,
    });
    expect(r.matched).toHaveLength(0);
    expect(r.discarded).toEqual(["src/math.ts"]);
    expect(r.manifest.attestations).toHaveLength(0);
  });

  it("discards files the AI wrote that no longer exist in the repo", () => {
    const r = captureLocalSpans({
      transcript: write("src/gone.ts", AI_SRC),
      repoRoot: ROOT,
      readFile: () => null,
      commit: "abc",
      operatorId: "mac@madeby.fyi",
      now: NOW,
    });
    expect(r.discarded).toEqual(["src/gone.ts"]);
  });

  it("ignores files outside the repo and our own .madeby records", () => {
    const transcript = [
      write("src/keep.ts", AI_SRC),
      JSON.stringify({ type: "assistant", message: { model: "claude", content: [{ type: "tool_use", name: "Write", input: { file_path: "/elsewhere/x.ts", content: AI_SRC } }] } }),
      JSON.stringify({ type: "assistant", message: { model: "claude", content: [{ type: "tool_use", name: "Write", input: { file_path: `${ROOT}/.madeby/spans/x.json`, content: "{}" } }] } }),
    ].join("\n");
    const r = captureLocalSpans({ transcript, repoRoot: ROOT, readFile: () => AI_SRC, commit: "abc", operatorId: "m@x", now: NOW });
    expect(r.matched).toEqual(["src/keep.ts"]);
  });
});
