// The parser-sample redactor (#85 contribution path). Turns a user's real AI-tool session log into a
// CONTENT-FREE format skeleton they can hand us to add a parser for a tool we don't yet support —
// without any of their code, prompts, or secrets leaving the machine. This is the spine ("nothing
// leaves your machine") pointed at product improvement: a parser keys on a log's FORMAT (where the
// path / content / model sit), never on the content, so a redacted skeleton costs us nothing and
// costs the user no privacy.
//
// Safety model: ALLOW-LIST, not deny-list. Nothing is emitted verbatim unless it is a structural
// token we recognize (a JSON key, a markdown marker, a fence delimiter, a model identifier). Every
// value/body is replaced with a typed placeholder. Over-redaction is the safe failure mode: the
// skeleton stays useful (structure is visible) even when it strips too much. The user reviews the
// output before sharing.

const HEADER =
  "<!-- madeby parser-sample — STRUCTURE ONLY. All code, prompts, paths, and secrets were redacted\n" +
  "     locally; only the log's format/keys and model identifiers remain. Safe to attach to an issue.\n" +
  "     A parser keys on this shape, not on content — see packages/analyzer/src/tool-parsers.ts. -->";

// JSON string values under these keys are structural enums / identifiers, not user content → kept.
const SAFE_JSON_KEYS = new Set([
  "type", "role", "name", "model", "provider", "source", "id", "uuid", "tool", "toolName",
  "stop_reason", "stopReason", "finish_reason", "status", "event", "kind", "version", "format",
  "editFormat", "modelName", "agent", "modelId",
]);
// keys whose value is a filesystem path → replaced with a placeholder that keeps only the extension.
const PATH_JSON_KEYS = new Set(["path", "file_path", "filePath", "uri", "fsPath", "filename", "file"]);

function extPlaceholder(v: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(v.trim());
  return m ? `<path>.${m[1]}` : "<path>";
}

function redactJsonValue(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    if (key && PATH_JSON_KEYS.has(key)) return extPlaceholder(value);
    if (key && SAFE_JSON_KEYS.has(key)) return value; // enum/identifier, non-sensitive
    return value === "" ? "" : "<redacted>";
  }
  if (Array.isArray(value)) return value.map((v) => redactJsonValue(v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactJsonValue(v, k);
    return out;
  }
  return value; // numbers / booleans / null are structural, non-sensitive
}

/** True if most non-empty lines parse as JSON objects (a JSONL transcript, e.g. Claude Code). */
function looksLikeJsonl(lines: string[]): boolean {
  const nonEmpty = lines.filter((l) => l.trim());
  if (!nonEmpty.length) return false;
  let ok = 0;
  for (const l of nonEmpty.slice(0, 50)) {
    try {
      const v = JSON.parse(l);
      if (v && typeof v === "object") ok += 1;
    } catch {
      /* not json */
    }
  }
  return ok >= Math.min(nonEmpty.length, 50) * 0.6;
}

function redactJsonl(lines: string[]): string {
  return lines
    .map((l) => {
      if (!l.trim()) return "";
      try {
        return JSON.stringify(redactJsonValue(JSON.parse(l)));
      } catch {
        return "<redacted>";
      }
    })
    .join("\n");
}

// --- Markdown / text mode (aider, SpecStory, and unknown text logs) ---------------------------------
// Keep a line only if it matches a structural marker; redact any embedded path/prompt within it.

const FENCE = /^(\s*```+)([A-Za-z0-9+.-]*)(.*)$/; // fence open/close, optional lang + trailing (e.g. `:path`)
const BARE_PATH_LINE = /^[\w./\\-]+\.[A-Za-z0-9]{1,8}$/; // aider's filename line
// Structural markers kept verbatim (they carry no user content): S/R delimiters, role/turn markers,
// horizontal rules, SpecStory HTML wrappers, and blockquote status lines aider/SpecStory print.
const KEEP_VERBATIM =
  /^(<<<<<<< SEARCH|=======|>>>>>>> REPLACE|_\*\*(?:User|Assistant)\*\*_|---+|> (?:Model|Aider v|Tokens|Git repo|Repo-map|Added|Cost|Warning|You can skip):|<\/?details>|<\/?summary>)/;

/** Keep the model line's identifier + edit-format (both non-sensitive) and drop anything else. */
function redactModelLine(line: string): string {
  const m = /^(\s*> Model:\s*)(\S+)(\s+with\s+[\w-]+ edit format.*)?$/.exec(line);
  return m ? `${m[1]}${m[2]}${m[3] ?? ""}` : "> Model: <redacted>";
}

// Redact filesystem paths inside an otherwise-structural line. Catches rooted paths (absolute / home /
// drive / dot-relative) and multi-segment relative paths — but NOT a bare `provider/model` id (one
// separator, unrooted) and NOT the `/` in an HTML close tag (anchored to a word/space boundary, never
// after `<`). Applied to every kept line except the model line (handled above).
function redactPathsInline(s: string): string {
  return s
    // labeled file references: "Read file: X", "Edit file: X", "Git repo: X", …
    .replace(/((?:file|repo|path|reading|writing|created|modified|deleted):\s*)([^\s<>"']+)/gi, (_m, lbl: string, p: string) => lbl + extPlaceholder(p))
    // rooted paths, anchored after start/space/paren so `</summary>` is untouched
    .replace(/(^|[\s(])((?:[A-Za-z]:[\\/]|~[\\/]|\.{1,2}[\\/]|[\\/])[\w./\\-]*)/g, (_m, pre: string, p: string) => pre + extPlaceholder(p))
    // multi-segment relative paths (>=2 separators); a one-separator provider/model id is preserved
    .replace(/(^|[\s(])((?:[\w.-]+[\\/]){2,}[\w.-]*)/g, (_m, pre: string, p: string) => pre + extPlaceholder(p));
}

function redactMarkdown(lines: string[]): string {
  const out: string[] = [];
  let inFence = false;
  const pushRedacted = () => {
    if (out[out.length - 1] !== "<redacted>") out.push("<redacted>"); // collapse runs
  };
  for (const raw of lines) {
    const fence = FENCE.exec(raw);
    if (fence) {
      // a fence delimiter is structure — keep it (with language), redact any `:path` filename suffix
      inFence = !inFence;
      const info = (fence[3] ?? "").replace(/[\w.-]*[\\/][\w./\\-]*/g, (m) => extPlaceholder(m));
      out.push(fence[1]!.trimStart() + fence[2] + info);
      continue;
    }
    if (inFence) {
      // inside a code fence: could be code OR a SEARCH/REPLACE block — keep the S/R delimiters so the
      // edit shape stays visible, redact everything else (the actual code content).
      if (KEEP_VERBATIM.test(raw)) out.push(raw);
      else pushRedacted();
      continue;
    }
    if (raw.trim() === "") {
      out.push("");
      continue;
    }
    if (/^#{1,6}\s/.test(raw)) {
      // a heading — keep the `#` level marker but redact the text (aider's `#### <prompt>` leaks it)
      out.push(raw.replace(/^(#{1,6}\s).*/, "$1<redacted>"));
      continue;
    }
    if (BARE_PATH_LINE.test(raw.trim())) {
      out.push(extPlaceholder(raw.trim())); // aider's filename-before-fence — keep the SHAPE, not the path
      continue;
    }
    if (KEEP_VERBATIM.test(raw)) {
      out.push(/^\s*> Model:/.test(raw) ? redactModelLine(raw) : redactPathsInline(raw));
      continue;
    }
    pushRedacted();
  }
  return out.join("\n");
}

/**
 * Redact a raw session log to a content-free format skeleton. Chooses JSONL vs markdown/text
 * automatically. The result reveals the log's STRUCTURE (keys, markers, fence shape, model ids) with
 * every payload replaced by a typed placeholder — safe for a user to review and attach to an issue.
 */
export function redactSample(raw: string): string {
  const lines = raw.split("\n");
  const body = looksLikeJsonl(lines) ? redactJsonl(lines) : redactMarkdown(lines);
  return `${HEADER}\n${body}\n`;
}
