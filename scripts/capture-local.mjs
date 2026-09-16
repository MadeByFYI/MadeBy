#!/usr/bin/env node
// The dev-script form of `madeby ai` (#80) — the on-ramp that collapses the adoption barrier from
// "set up a hook months ago" to "run one command now." Reads the user's OWN AI-tool session log locally,
// confirms the AI's work is structurally present in their checkout, and writes witnessed span
// evidence to .madeby/spans — privacy-clean (logs/content never leave the machine; only derived
// attribution is written). The mirror folds it in (provenance.ts), and the same act is the on-ramp
// to claim/verify.
//
// The structural-matching engine is @madeby/analyzer's captureLocalSpans (tested); this shell owns
// fs/git. Run via Node's type-stripping (the engine's only runtime core dep is the JSON-free
// @madeby/core/structural):
//   node --experimental-strip-types scripts/capture-local.mjs [transcript.jsonl] [commit]
// (Node ≥ 23.6 strips types without the flag.)

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { captureLocalSpans } from "../packages/analyzer/src/capture-local.ts";
import { detectParser } from "../packages/analyzer/src/tool-parsers.ts";

const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();
const repoRoot = git("rev-parse", "--show-toplevel");

function autodiscover() {
  const enc = repoRoot.replace(/[/_]/g, "-");
  try {
    return readdirSync(join(homedir(), ".claude", "projects", enc))
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(homedir(), ".claude", "projects", enc, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null;
  } catch {
    return null;
  }
}

const transcriptPath = process.argv[2] ?? autodiscover();
if (!transcriptPath || !existsSync(transcriptPath)) {
  console.error("transcript not found — pass it: capture-local <transcript.jsonl> [commit]");
  process.exit(1);
}
const commit = git("rev-parse", process.argv[3] ?? "HEAD");

const transcriptText = readFileSync(transcriptPath, "utf8");
const parser = detectParser(transcriptText);
if (!parser) {
  console.error("Unrecognized log format — no registered tool parser matched. (Claude Code is supported; other tools need a ToolParser + real sample logs — see tool-parsers.ts / #85.)");
  process.exit(1);
}

const result = captureLocalSpans({
  transcript: transcriptText,
  parser,
  repoRoot,
  readFile: (rel) => {
    try {
      return readFileSync(join(repoRoot, rel), "utf8");
    } catch {
      return null;
    }
  },
  commit,
  operatorId: git("show", "-s", "--format=%ae", commit),
  now: new Date().toISOString(),
});

if (result.manifest.attestations.length === 0) {
  console.log(`No AI-authored content from the session is structurally present in this checkout (matched 0, discarded ${result.discarded.length}). Nothing recorded.`);
  process.exit(0);
}

// Merge: keep any non-session-log attestations already recorded; replace session-log ones.
const out = join(repoRoot, ".madeby", "spans", `${commit}.json`);
let kept = [];
if (existsSync(out)) {
  const thisSource = `${result.tool}-session-log`;
  try {
    // Replace this tool's session-log attestations; keep everything else (other tools, trailers).
    kept = (JSON.parse(readFileSync(out, "utf8")).attestations ?? []).filter(
      (a) => a?.attribution?.source !== thisSource,
    );
  } catch {
    /* overwrite a malformed manifest */
  }
}
const manifest = { ...result.manifest, attestations: [...kept, ...result.manifest.attestations] };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${out} — [${result.tool}] ${result.matched.length} witnessed file(s) matched, ${result.discarded.length} discarded (not present in the checkout).`);
