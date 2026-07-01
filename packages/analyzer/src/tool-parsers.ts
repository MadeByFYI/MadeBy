// Pluggable AI-tool log parsers (#85). The recall fix (capture-local, #80) must eventually cover
// the whole viral surface — Cursor, Copilot, Windsurf, Aider — not just Claude Code. Each tool
// stores local logs in an entirely different format, so adding one should be an ISOLATED
// contribution: implement a ToolParser that normalizes that tool's logs to AiEdit[]; the structural
// -match backend (capture-local.ts) is shared and untouched.
//
// We ship the harness + the Claude Code reference parser now. Other parsers are deliberately NOT
// stubbed with guessed schemas — a parser lands when we have real sample logs for that tool (the
// "evidence, not guessing" line). This file is that clean extension point.

/** A normalized AI edit: content the tool recorded its model writing, and where. */
export interface AiEdit {
  /** absolute file path the tool recorded (the harness relativizes + filters to the repo) */
  path: string;
  /** the content the AI wrote (full file for a create, the region for an edit) */
  content: string;
  /** open model field, e.g. "claude-opus-4-8" */
  model: string;
}

export interface ToolParser {
  /** stable id, e.g. "claude-code" — also forms the attestation source `<id>-session-log` */
  id: string;
  /** the AI vendor this tool represents, for the attestation's provider field, e.g. "anthropic" */
  provider: string;
  /** cheap check: does this raw log look like this tool's format? */
  detect: (raw: string) => boolean;
  /** extract the AI edits from the raw log */
  parse: (raw: string) => AiEdit[];
}

const CLAUDE_WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

interface ClaudeRecord {
  type?: string;
  message?: { model?: string; content?: unknown[] };
}

function* claudeAssistantRecords(raw: string): Generator<ClaudeRecord> {
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let rec: ClaudeRecord;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type === "assistant" && Array.isArray(rec.message?.content)) yield rec;
  }
}

/** Claude Code transcript (`~/.claude/projects/**.jsonl`): assistant records with Write/Edit tool_use. */
export const claudeCodeParser: ToolParser = {
  id: "claude-code",
  provider: "anthropic",
  detect(raw) {
    for (const rec of claudeAssistantRecords(raw)) {
      for (const block of rec.message!.content as Array<Record<string, unknown>>) {
        if (block?.type === "tool_use" && CLAUDE_WRITE_TOOLS.has(block.name as string)) return true;
      }
    }
    return false;
  },
  parse(raw) {
    const edits: AiEdit[] = [];
    for (const rec of claudeAssistantRecords(raw)) {
      const model = rec.message?.model ?? "claude";
      for (const block of rec.message!.content as Array<Record<string, unknown>>) {
        if (block?.type !== "tool_use" || !CLAUDE_WRITE_TOOLS.has(block.name as string)) continue;
        const input = block.input as { file_path?: string; content?: string; new_string?: string } | undefined;
        const path = input?.file_path;
        const content = input?.content ?? input?.new_string ?? "";
        if (typeof path === "string" && content) edits.push({ path, content, model });
      }
    }
    return edits;
  },
};

/** Registered parsers. Add a tool here once its ToolParser exists (needs real sample logs). */
export const TOOL_PARSERS: readonly ToolParser[] = [claudeCodeParser];

/** Pick the parser whose format the log matches, or null if none recognize it. */
export function detectParser(raw: string, parsers: readonly ToolParser[] = TOOL_PARSERS): ToolParser | null {
  return parsers.find((p) => p.detect(raw)) ?? null;
}
