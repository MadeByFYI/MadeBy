// Where the agent's model version comes from when a repo records it (`madeby init --record-model`):
// the TOOL's own record of the session, not the agent's memory of itself. An agent often doesn't know
// which model served it (Cursor's "Auto" routes per request), but the tool does — Cursor puts it in the
// agent shell's environment, Copilot CLI and Claude Code write it into the local session log. We read
// only the model id, locally; nothing leaves the machine. Still the asserted tier (self-reported by the
// tool, unsigned), but a better witness than a guess. Open: add a source for another tool here.

import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface DetectedModel {
  /** the tool, as it should be named in the disclosure */
  tool: string;
  /** the model version, exactly as the tool records it */
  model: string;
  /** where it was read, for the user-facing note — e.g. "Cursor's CURSOR_MODEL" */
  source: string;
}

interface ModelSource {
  /** the tool name to disclose */
  tool: string;
  /** a disclosed tool name this source speaks for (a generic "AI" is filled in, any other is left alone) */
  matches: RegExp;
  detect(env: Record<string, string | undefined>, home: string, cwd: string): { model: string; source: string } | null;
}

const SESSION_ID = /^[0-9a-f-]{8,64}$/i; // a session id is a uuid — never a path
const TAIL_BYTES = 2 * 1024 * 1024;

/** The last `"model":"…"` in the tail of a session log, skipping placeholders such as "<synthetic>". */
function lastModelIn(path: string): string | null {
  let fd: number | undefined;
  try {
    const size = statSync(path).size;
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fd = openSync(path, "r");
    readSync(fd, buf, 0, len, size - len);
    const models = [...buf.toString("utf8").matchAll(/"(?:model|newModel)"\s*:\s*"([^"<][^"]{0,80})"/g)].map((m) => m[1]!);
    return models.at(-1) ?? null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

const RECENT_MS = 30 * 60 * 1000; // a chat touched in the last half hour is this session's

/**
 * The model Cursor's own chat store recorded for the agent working in `cwd`: `~/.cursor/chats/
 * <md5(cwd)>/<chat>/store.db`, newest chat, if touched recently. Each turn carries
 * `"modelName":"…"` (what Auto actually routed to). Fail-safe: filled only when the chat names exactly
 * one model — a chat that switched models gives no answer rather than a wrong one.
 */
function cursorChatModel(home: string, cwd: string): string | null {
  const dir = join(home, ".cursor", "chats", createHash("md5").update(cwd).digest("hex"));
  try {
    const chats = readdirSync(dir)
      .map((c) => ({ c, t: statSync(join(dir, c)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    const newest = chats[0];
    if (!newest || Date.now() - newest.t > RECENT_MS) return null;
    const db = join(dir, newest.c, "store.db");
    if (!existsSync(db) || statSync(db).size > 64 * 1024 * 1024) return null;
    const names = new Set([...readFileSync(db).toString("latin1").matchAll(/"modelName"\s*:\s*"([^"]{1,80})"/g)].map((m) => m[1]!));
    return names.size === 1 ? [...names][0]! : null;
  } catch {
    return null;
  }
}

export const MODEL_SOURCES: ModelSource[] = [
  {
    tool: "Cursor",
    matches: /\bcursor/i,
    // Cursor's agent shell sets CURSOR_MODEL — but not always (none of four Auto trials saw it), so its
    // chat store is the second witness. Either is the tool's record, not the agent's guess.
    detect: (env, home, cwd) => {
      if (env.CURSOR_AGENT === "1" && env.CURSOR_MODEL?.trim()) return { model: env.CURSOR_MODEL.trim(), source: "Cursor's CURSOR_MODEL" };
      const model = cursorChatModel(home, cwd);
      return model ? { model, source: "Cursor's chat store" } : null;
    },
  },
  {
    tool: "GitHub Copilot CLI",
    matches: /copilot/i,
    detect: (env, home) => {
      const id = env.COPILOT_AGENT_SESSION_ID;
      if (env.COPILOT_CLI !== "1" || !id || !SESSION_ID.test(id)) return null;
      const model = lastModelIn(join(home, ".copilot", "session-state", id, "events.jsonl"));
      return model ? { model, source: "Copilot's session log" } : null;
    },
  },
  {
    tool: "Claude Code",
    matches: /claude/i,
    detect: (env, home) => {
      const id = env.CLAUDE_CODE_SESSION_ID;
      if (env.CLAUDECODE !== "1" || !id || !SESSION_ID.test(id)) return null;
      const projects = join(home, ".claude", "projects");
      if (!existsSync(projects)) return null;
      try {
        for (const dir of readdirSync(projects)) {
          const p = join(projects, dir, `${id}.jsonl`);
          if (existsSync(p)) {
            const model = lastModelIn(p);
            return model ? { model, source: "Claude Code's session transcript" } : null;
          }
        }
      } catch {
        /* unreadable ⇒ no detection */
      }
      return null;
    },
  },
];

/**
 * The model the running tool records, for a disclosure naming `tool`. A generic tool ("AI") takes the
 * detected tool's name; a named tool is only filled by a source that speaks for it (an agent that says
 * "Aider" inside a Cursor shell is not overruled). Null when no source applies — fall back to the
 * agent's own `--model`, or none.
 */
export function detectAgentModel(
  tool: string,
  env: Record<string, string | undefined> = process.env,
  home: string = homedir(),
  cwd: string = process.cwd(),
): DetectedModel | null {
  const generic = /^(?:AI|an? AI)$/i.test(tool.trim());
  for (const s of MODEL_SOURCES) {
    if (!generic && !s.matches.test(tool)) continue;
    const hit = s.detect(env, home, cwd);
    if (hit) return { tool: generic ? s.tool : tool, ...hit };
  }
  return null;
}
