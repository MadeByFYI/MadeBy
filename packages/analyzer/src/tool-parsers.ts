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
  /** the path the tool recorded — absolute (Claude Code) or repo-relative (aider); the harness
   *  normalizes backslashes, relativizes, and filters to the repo */
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

// aider (`.aider.chat.history.md`, #85). aider commits a durable markdown transcript to the repo
// root, so — unlike Copilot/Cursor inline completion — its edits are recoverable. Format reverse-
// engineered from real public logs (tooshel/poppoll, mpazaryna/codex, launchapp-dev/animus-cli), not
// guessed. Two edit formats appear in the wild, both handled:
//   • "diff"  (default): a filename line, then a fenced block holding SEARCH/REPLACE — the AI-written
//              content is the REPLACE side.
//   • "whole" (weaker models): a filename line, then a fenced block holding the entire new file.
// The tool announces which: `> Model: <model> with <fmt> edit format`. We read that for the model and
// only slurp whole-file fences when the session actually declared the whole format (else a stray code
// block in prose could be mistaken for a file write).
const AIDER_FENCE = /^([^\n]+)\n```[^\n]*\n([\s\S]*?)\r?\n```/gm;
const AIDER_FILENAME = /^[\w./\\-]+\.\w+$/; // a path-like line (extension required) before the fence
// The SEARCH side is optional: a file CREATION has an empty search (`SEARCH` then `=======` on the
// next line), which real logs (mpazaryna/codex) do constantly. The REPLACE side (group 1) is the
// AI-written content.
const AIDER_SR = /<<<<<<< SEARCH\r?\n(?:[\s\S]*?\r?\n)?=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;
const AIDER_MODEL = /^> Model:\s*(.+?)\s+with\s+[\w-]+ edit format/gim;

/** the model aider announced most recently before position `pos` (fallback: the tool name). */
function aiderModelAt(raw: string, pos: number): string {
  let model = "aider";
  AIDER_MODEL.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = AIDER_MODEL.exec(raw)); ) {
    if (m.index > pos) break;
    model = m[1]!.trim();
  }
  return model;
}

export const aiderParser: ToolParser = {
  id: "aider",
  provider: "aider",
  detect(raw) {
    return /^# aider chat started at /m.test(raw) || /^> Aider v\d/m.test(raw);
  },
  parse(raw) {
    const wholeFormat = /with whole edit format/i.test(raw);
    const edits: AiEdit[] = [];
    AIDER_FENCE.lastIndex = 0;
    for (let f: RegExpExecArray | null; (f = AIDER_FENCE.exec(raw)); ) {
      const name = f[1]!.trim();
      if (!AIDER_FILENAME.test(name)) continue; // the preceding line isn't a filename → not an edit
      const path = name.replace(/\\/g, "/");
      const body = f[2]!;
      const model = aiderModelAt(raw, f.index);
      let sawSearchReplace = false;
      AIDER_SR.lastIndex = 0;
      for (let s: RegExpExecArray | null; (s = AIDER_SR.exec(body)); ) {
        sawSearchReplace = true;
        const content = s[1]!; // the REPLACE side = what the AI wrote
        if (content.trim()) edits.push({ path, content, model });
      }
      if (!sawSearchReplace && wholeFormat && body.trim()) edits.push({ path, content: body, model });
    }
    return edits;
  },
};

/** Registered parsers. Add a tool here once its ToolParser exists (needs real sample logs). */
export const TOOL_PARSERS: readonly ToolParser[] = [claudeCodeParser, aiderParser];

/** Pick the parser whose format the log matches, or null if none recognize it. */
export function detectParser(raw: string, parsers: readonly ToolParser[] = TOOL_PARSERS): ToolParser | null {
  return parsers.find((p) => p.detect(raw)) ?? null;
}
