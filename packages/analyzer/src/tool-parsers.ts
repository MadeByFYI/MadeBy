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

// SpecStory (`.specstory/history/*.md`, #85). A committed, cross-tool capture (Cursor, Copilot Chat,
// terminal CLIs) — the practical route to CURSOR coverage, whose own store is a local binary SQLite
// that's near-never committed. Format from real public logs (langwatch/better-agents): each edit is
//   <details><summary>Tool use: **<tool>** • Edit file: <abs path></summary> … ```diff …@@…\n+ new\n``` …</details>
// The AI-written content is the `+` (added) lines, HTML-UNescaped. The model is announced per turn in
// an `_**Agent (model <model>, mode …)**_` marker. Fidelity is PARTIAL by nature — Cursor records a
// diff, not the whole file — so we attest the added region and let the structural-match backend
// honestly discard a fragment that isn't present in the committed file.
const SPECSTORY_EDIT =
  /<summary>Tool use:[^<]*?(?:Edit|Write|Create) file:\s*([^\n<]+?)\s*<\/summary>([\s\S]*?)<\/details>/g;
const SPECSTORY_DIFF = /```diff\r?\n([\s\S]*?)```/g;
const SPECSTORY_MODEL = /_\*\*Agent \(model ([\w./:+-]+)/gi;

function htmlUnescape(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&"); // last, so an escaped entity (&amp;lt;) isn't double-decoded
}

/** the model SpecStory announced most recently before position `pos` (fallback: the tool name). */
function specstoryModelAt(raw: string, pos: number): string {
  let model = "specstory";
  SPECSTORY_MODEL.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = SPECSTORY_MODEL.exec(raw)); ) {
    if (m.index > pos) break;
    model = m[1]!.trim();
  }
  return model;
}

export const specstoryParser: ToolParser = {
  id: "specstory",
  provider: "specstory",
  detect(raw) {
    return /^<!-- Generated by SpecStory/m.test(raw) || /<summary>Tool use: \*\*/.test(raw);
  },
  parse(raw) {
    const edits: AiEdit[] = [];
    SPECSTORY_EDIT.lastIndex = 0;
    for (let m: RegExpExecArray | null; (m = SPECSTORY_EDIT.exec(raw)); ) {
      const path = m[1]!.trim();
      const model = specstoryModelAt(raw, m.index);
      const added: string[] = [];
      SPECSTORY_DIFF.lastIndex = 0;
      for (let d: RegExpExecArray | null; (d = SPECSTORY_DIFF.exec(m[2]!)); ) {
        for (const line of d[1]!.split("\n")) {
          if (line.startsWith("+") && !line.startsWith("+++")) added.push(htmlUnescape(line.replace(/^\+ ?/, "")));
        }
      }
      const content = added.join("\n");
      if (content.trim()) edits.push({ path, content, model });
    }
    return edits;
  },
};

// The open tool-parser registry — the capture-side of the symmetric plugin model (ARCHITECTURE §12),
// mirroring registerHostAdapter. A third party who uses a tool we don't support can register a
// ToolParser for it WITHOUT forking core: they validate it against their OWN local logs (which never
// leave their machine — the spine) and contribute the parser code. Built-ins register through the
// same door; nothing here is privileged over a third party's parser.
const registry = new Map<string, ToolParser>();

/** Register a tool parser (idempotent by id). A third-party parser is a first-class citizen here. */
export function registerToolParser(parser: ToolParser): void {
  registry.set(parser.id, parser);
}

/** All registered parsers — for discovery ("which tools can `madeby ai` capture?") and detection. */
export function listToolParsers(): ToolParser[] {
  return [...registry.values()];
}

// The reference parsers register through the open door, same as any contribution.
registerToolParser(claudeCodeParser);
registerToolParser(aiderParser);
registerToolParser(specstoryParser);

/** Pick the parser whose format the log matches, or null if none recognize it. */
export function detectParser(raw: string, parsers: readonly ToolParser[] = listToolParsers()): ToolParser | null {
  return parsers.find((p) => p.detect(raw)) ?? null;
}
