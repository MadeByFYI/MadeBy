// `recordAiSpans` — the disclosure WRITE primitive as a library function (shared by `madeby ai` and
// the MCP `ai` tool). Reads a local AI-tool session log, confirms the AI's work is structurally
// present in the checkout, and writes witnessed span evidence to `.madeby/spans` (asserted tier,
// self-reported). Honest by construction: `captureLocalSpans` discards any span whose content isn't
// present, so it cannot over-claim; and it can never mint a higher tier or attribute to anyone else.
// Privacy-clean: the log/content never leave the machine — only derived attribution is written.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { serializeSpanManifest, parseSpanManifest, type SpanAttestationV0 } from "@madeby/core";
import { captureLocalSpans } from "./capture-local";
import { detectParser } from "./tool-parsers";

export interface RecordOptions {
  /** explicit transcript path; omitted ⇒ auto-discover the Claude Code transcript for this repo */
  transcriptPath?: string;
  /** the commit the spans anchor to (default HEAD) */
  ref?: string;
  /** ISO timestamp (injectable for tests) */
  now?: string;
}

export interface RecordResult {
  written: boolean;
  /** the manifest path written, when written */
  path?: string;
  /** the tool whose session produced the spans, e.g. "claude-code" */
  tool?: string;
  matched: number;
  discarded: number;
  message: string;
  /** an input-problem code when nothing was written: "transcript-not-found" | "unrecognized-format" */
  error?: string;
}

function git(root: string, ...a: string[]): string {
  return execFileSync("git", ["-C", root, "-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();
}

/** Newest Claude Code transcript for this repo, or null. */
function autodiscover(root: string): string | null {
  const enc = root.replace(/[/_]/g, "-");
  try {
    const dir = join(homedir(), ".claude", "projects", enc);
    return (
      readdirSync(dir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => join(dir, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null
    );
  } catch {
    return null;
  }
}

/** Capture witnessed AI spans from a session log into `.madeby/spans`. Never throws on input problems. */
export function recordAiSpans(root: string, opts: RecordOptions = {}): RecordResult {
  const transcriptPath = opts.transcriptPath ?? autodiscover(root);
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return { written: false, matched: 0, discarded: 0, message: "transcript not found — pass a transcript path", error: "transcript-not-found" };
  }

  const commit = git(root, "rev-parse", opts.ref ?? "HEAD");
  const transcriptText = readFileSync(transcriptPath, "utf8");
  const parser = detectParser(transcriptText);
  if (!parser) {
    return { written: false, matched: 0, discarded: 0, message: "unrecognized log format (Claude Code is supported today)", error: "unrecognized-format" };
  }

  const result = captureLocalSpans({
    transcript: transcriptText,
    parser,
    repoRoot: root,
    readFile: (rel) => {
      try {
        return readFileSync(join(root, rel), "utf8");
      } catch {
        return null;
      }
    },
    commit,
    operatorId: git(root, "show", "-s", "--format=%ae", commit),
    now: opts.now ?? new Date().toISOString(),
  });

  if (result.manifest.attestations.length === 0) {
    return {
      written: false,
      tool: result.tool ?? undefined,
      matched: 0,
      discarded: result.discarded.length,
      message: `no AI-authored content from the session is structurally present (matched 0, discarded ${result.discarded.length})`,
    };
  }

  // Merge: replace this tool's session-log attestations, keep everything else (other tools, trailers).
  const out = join(root, ".madeby", "spans", `${commit}.json`);
  let kept: SpanAttestationV0[] = [];
  if (existsSync(out)) {
    const thisSource = `${result.tool}-session-log`;
    try {
      kept = parseSpanManifest(readFileSync(out, "utf8")).attestations.filter((a) => a.attribution.source !== thisSource);
    } catch {
      /* overwrite a malformed/legacy manifest */
    }
  }
  const manifest = { ...result.manifest, attestations: [...kept, ...result.manifest.attestations] };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, serializeSpanManifest(manifest));

  return {
    written: true,
    path: out,
    tool: result.tool ?? undefined,
    matched: result.matched.length,
    discarded: result.discarded.length,
    message: `wrote ${result.matched.length} witnessed file(s) (${result.discarded.length} discarded)`,
  };
}
