import { describe, it, expect } from "vitest";
import { claudeCodeParser, detectParser, type ToolParser } from "./tool-parsers";
import { captureLocalSpans } from "./capture-local";

const ROOT = "/repo";
const AI_SRC = "export function add(a, b) {\n  return a + b;\n}\n";

const claudeWrite = (path: string, content: string, model = "claude-opus-4-8") =>
  JSON.stringify({ type: "assistant", message: { model, content: [{ type: "tool_use", name: "Write", input: { file_path: `${ROOT}/${path}`, content } }] } });

describe("Claude Code parser", () => {
  it("detects its own transcript and extracts normalized edits", () => {
    const raw = claudeWrite("src/math.ts", AI_SRC);
    expect(claudeCodeParser.detect(raw)).toBe(true);
    const edits = claudeCodeParser.parse(raw);
    expect(edits).toEqual([{ path: "/repo/src/math.ts", content: AI_SRC, model: "claude-opus-4-8" }]);
  });

  it("does not detect an unrelated log", () => {
    expect(claudeCodeParser.detect('{"foo":"bar"}\nplain text')).toBe(false);
    expect(detectParser("nothing here")).toBeNull();
  });
});

describe("the harness is pluggable — a new tool needs only a ToolParser", () => {
  // A fake parser for a made-up tool with a totally different log format. We are NOT shipping this
  // (real tools need real sample logs); it proves a parser flows through the shared structural
  // -match backend with zero changes to capture-local.
  const fakeToolParser: ToolParser = {
    id: "acme-ai",
    provider: "acme",
    detect: (raw) => raw.startsWith("ACME-LOG"),
    parse: (raw) =>
      raw
        .split("\n")
        .filter((l) => l.startsWith("EDIT "))
        .map((l) => {
          const [, path, ...rest] = l.split(" ");
          return { path: `${ROOT}/${path}`, content: rest.join(" "), model: "acme-model-1" };
        }),
  };

  it("auto-detects and routes to a registered-style parser, sharing the structural backend", () => {
    const raw = `ACME-LOG v1\nEDIT src/math.ts ${AI_SRC.replace(/\n/g, " ")}`;
    const r = captureLocalSpans({
      transcript: raw,
      repoRoot: ROOT,
      readFile: () => AI_SRC, // committed content matches → attested by the shared backend
      commit: "abc",
      operatorId: "mac@madeby.fyi",
      now: "2026-06-30T00:00:00Z",
      parser: fakeToolParser,
    });
    expect(r.tool).toBe("acme-ai");
    expect(r.matched).toEqual(["src/math.ts"]);
    expect(r.manifest.attestations[0]!.attribution.provider).toBe("acme");
    expect(r.manifest.attestations[0]!.attribution.source).toBe("acme-ai-session-log");
    expect(r.manifest.attestations[0]!.attribution.model).toBe("acme-model-1");
  });

  it("an unrecognized log is an honest no-op (no tool, no attestations)", () => {
    const r = captureLocalSpans({
      transcript: "some log we can't parse",
      repoRoot: ROOT,
      readFile: () => AI_SRC,
      commit: "abc",
      operatorId: "m@x",
      now: "2026-06-30T00:00:00Z",
    });
    expect(r.tool).toBeNull();
    expect(r.manifest.attestations).toHaveLength(0);
  });
});
