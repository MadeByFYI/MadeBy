import { describe, it, expect } from "vitest";
import { claudeCodeParser, aiderParser, detectParser, registerToolParser, listToolParsers, type ToolParser } from "./tool-parsers";
import { captureLocalSpans } from "./capture-local";

const ROOT = "/repo";
const AI_SRC = "export function add(a, b) {\n  return a + b;\n}\n";

// A fenced-code delimiter as a plain string, so the aider fixtures below (which embed fences) stay
// readable inside JS template/array literals.
const F = "```";
const AIDER_SRC = "export function add(a, b) {\n  return a + b;\n}";
// A minimal `.aider.chat.history.md`, faithful to the real format (tooshel/poppoll, mpazaryna/codex):
// a `# aider chat started` header, a `> Model: … with <fmt> edit format` line, `####` user turns, and
// edits as a filename line + a fenced SEARCH/REPLACE block.
const aiderDiffLog = (path: string, replace: string, model = "gpt-4o") =>
  [
    "# aider chat started at 2026-08-13 10:00:00",
    "",
    "> Aider v0.86.2",
    `> Model: ${model} with diff edit format`,
    "",
    "#### fix add()",
    "",
    "Here's the fix:",
    "",
    path,
    `${F}ts`,
    "<<<<<<< SEARCH",
    "export function add(a, b) { return 0 }",
    "=======",
    replace,
    ">>>>>>> REPLACE",
    F,
    "",
    "> Tokens: 1.0k sent, 20 received.",
  ].join("\n");

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

describe("aider parser (#85 — format reverse-engineered from real public logs)", () => {
  it("detects .aider.chat.history.md and extracts the REPLACE side as the AI content", () => {
    const raw = aiderDiffLog("src/math.ts", AIDER_SRC);
    expect(aiderParser.detect(raw)).toBe(true);
    expect(aiderParser.parse(raw)).toEqual([{ path: "src/math.ts", content: AIDER_SRC, model: "gpt-4o" }]);
  });

  it("normalizes Windows backslash paths and reads the announced model", () => {
    const raw = aiderDiffLog("src\\lib\\util.ts", AIDER_SRC, "anthropic/claude-3-5-sonnet");
    expect(aiderParser.parse(raw)[0]).toMatchObject({ path: "src/lib/util.ts", model: "anthropic/claude-3-5-sonnet" });
  });

  it("emits one edit per SEARCH/REPLACE, and ignores prose fences with no filename line", () => {
    const two = aiderDiffLog("src/math.ts", AIDER_SRC) + "\n" + aiderDiffLog("src/other.ts", "export const x = 1;", "gpt-4o");
    const edits = aiderParser.parse(two);
    expect(edits.map((e) => e.path)).toEqual(["src/math.ts", "src/other.ts"]);
  });

  it("captures a file CREATION (empty SEARCH side) — the common real-log case", () => {
    // aider writes a new file as an empty-search SEARCH/REPLACE (verified on mpazaryna/codex).
    const created = "export const answer = 42;";
    const raw = [
      "# aider chat started at 2026-08-13",
      "> Model: gpt-4o with diff edit format",
      "",
      "src/new.ts",
      `${F}ts`,
      "<<<<<<< SEARCH",
      "=======",
      created,
      ">>>>>>> REPLACE",
      F,
    ].join("\n");
    expect(aiderParser.parse(raw)).toEqual([{ path: "src/new.ts", content: created, model: "gpt-4o" }]);
  });

  it("reads the 'whole' edit format ONLY when the session declared it (else a prose fence isn't a write)", () => {
    const whole = [
      "# aider chat started at 2026-08-13",
      "> Model: local/model with whole edit format",
      "",
      "app.py",
      `${F}python`,
      "print('hi')",
      F,
    ].join("\n");
    expect(aiderParser.parse(whole)).toEqual([{ path: "app.py", content: "print('hi')", model: "local/model" }]);
    expect(aiderParser.parse(whole.replace("with whole edit format", "with diff edit format"))).toEqual([]);
  });

  it("auto-routes via detectParser + the shared backend to an aider-session-log attestation", () => {
    const raw = aiderDiffLog("src/math.ts", AIDER_SRC);
    const parser = detectParser(raw)!;
    expect(parser.id).toBe("aider");
    const r = captureLocalSpans({
      transcript: raw,
      repoRoot: ROOT,
      readFile: () => `${AIDER_SRC}\n`, // committed content matches the AI's REPLACE content
      commit: "abc",
      operatorId: "mac@madeby.fyi",
      now: "2026-08-13T00:00:00Z",
      parser,
    });
    expect(r.tool).toBe("aider");
    expect(r.matched).toEqual(["src/math.ts"]);
    expect(r.manifest.attestations[0]!.attribution.provider).toBe("aider");
    expect(r.manifest.attestations[0]!.attribution.source).toBe("aider-session-log");
    expect(r.manifest.attestations[0]!.attribution.model).toBe("gpt-4o");
  });
});

describe("open tool-parser registry (ARCHITECTURE §12 — a parser is a first-class contribution)", () => {
  it("registers a third-party parser through the same door as the built-ins, and detects it", () => {
    const before = listToolParsers().length;
    const acme: ToolParser = { id: "acme-ai-x", provider: "acme", detect: (r) => r.startsWith("ACME-X"), parse: () => [] };
    registerToolParser(acme);
    expect(listToolParsers().length).toBe(before + 1);
    expect(detectParser("ACME-X\nlog")?.id).toBe("acme-ai-x");
    // idempotent by id — re-registering does not duplicate
    registerToolParser(acme);
    expect(listToolParsers().length).toBe(before + 1);
  });

  it("ships the two reference parsers registered by default", () => {
    const ids = listToolParsers().map((p) => p.id);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("aider");
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
