import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { detectAgentModel } from "./model-source";

const dirs: string[] = [];
const home = (): string => {
  const d = mkdtempSync(join(tmpdir(), "madeby-home-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const ID = "8df29524-c9e4-40ac-8b20-a480cf391e46";

describe("detectAgentModel — the model from the tool's own record, never the agent's guess", () => {
  it("Cursor: reads CURSOR_MODEL in a Cursor agent shell (what Auto actually routed to)", () => {
    expect(detectAgentModel("Cursor", { CURSOR_AGENT: "1", CURSOR_MODEL: "composer-2-fast" }, home())).toEqual({
      tool: "Cursor",
      model: "composer-2-fast",
      source: "Cursor's CURSOR_MODEL",
    });
  });

  it("Copilot CLI: the last model in its session log", () => {
    const h = home();
    mkdirSync(join(h, ".copilot", "session-state", ID), { recursive: true });
    writeFileSync(
      join(h, ".copilot", "session-state", ID, "events.jsonl"),
      '{"type":"session.model_change","data":{"newModel":"gpt-5.2"}}\n{"type":"assistant.message","data":{"model":"claude-sonnet-5.5"}}\n',
    );
    expect(detectAgentModel("GitHub Copilot", { COPILOT_CLI: "1", COPILOT_AGENT_SESSION_ID: ID }, h)).toMatchObject({ tool: "GitHub Copilot", model: "claude-sonnet-5.5" });
  });

  it("Claude Code: the last model in its transcript, skipping placeholders", () => {
    const h = home();
    mkdirSync(join(h, ".claude", "projects", "-some-repo"), { recursive: true });
    writeFileSync(join(h, ".claude", "projects", "-some-repo", `${ID}.jsonl`), '{"message":{"model":"claude-opus-5-5"}}\n{"message":{"model":"<synthetic>"}}\n');
    expect(detectAgentModel("Claude Code", { CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: ID }, h)).toMatchObject({ model: "claude-opus-5-5" });
  });

  it("a generic tool takes the detected tool's name; a different named tool is never overruled", () => {
    const env = { CURSOR_AGENT: "1", CURSOR_MODEL: "composer-2-fast" };
    expect(detectAgentModel("AI", env, home())).toMatchObject({ tool: "Cursor", model: "composer-2-fast" });
    expect(detectAgentModel("Aider", env, home())).toBeNull();
  });

  it("fails safe: no flag, no file, or a path-like session id ⇒ null", () => {
    const h = home();
    expect(detectAgentModel("Cursor", { CURSOR_MODEL: "x" }, h)).toBeNull(); // not a Cursor agent shell
    expect(detectAgentModel("Copilot", { COPILOT_CLI: "1", COPILOT_AGENT_SESSION_ID: ID }, h)).toBeNull(); // no log
    expect(detectAgentModel("Copilot", { COPILOT_CLI: "1", COPILOT_AGENT_SESSION_ID: "../../etc" }, h)).toBeNull();
  });
});
