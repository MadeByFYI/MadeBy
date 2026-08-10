import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectTooling, readToolingFromDir } from "./tooling";

describe("detectTooling — committed AI-tool config as zero-cost disclosure evidence", () => {
  it("detects a tool from a marker FILE", () => {
    const t = detectTooling([".cursorrules", "src/index.ts", "README.md"]);
    expect(t.tools.map((x) => x.id)).toEqual(["cursor"]);
    expect(t.tools[0]!.evidencePath).toBe(".cursorrules");
  });

  it("detects a tool from a marker DIRECTORY (a path inside it)", () => {
    const t = detectTooling([".github/copilot-instructions.md", ".claude/settings.json", "main.py"]);
    expect(t.tools.map((x) => x.id).sort()).toEqual(["claude-code", "github-copilot"]);
  });

  it("reports each tool once, with its first proving path", () => {
    const t = detectTooling([".cursor/rules/a.md", ".cursorrules"]);
    expect(t.tools).toHaveLength(1);
    expect(t.tools[0]!.id).toBe("cursor");
    expect(t.tools[0]!.evidencePath).toBe(".cursor/rules/a.md"); // dir marker matched first
  });

  it("does not fire on ordinary project files (evidence-grade markers only)", () => {
    expect(detectTooling(["src/cursor.ts", "docs/copilot.md", "claude.txt"]).tools).toEqual([]);
    expect(detectTooling([]).tools).toEqual([]);
  });

  it("reads tooling from a local checkout by probing marker paths", () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-tooling-"));
    try {
      mkdirSync(join(dir, ".cursor"), { recursive: true });
      writeFileSync(join(dir, "CLAUDE.md"), "# context\n");
      const t = readToolingFromDir(dir);
      expect(t.tools.map((x) => x.id).sort()).toEqual(["claude-code", "cursor"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
