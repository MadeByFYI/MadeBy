#!/usr/bin/env node
// Dogfood / #68 — capture WITNESSED span evidence from a Claude Code session transcript.
//
// The commit-trailer signal under-detects AI (inline edits leave no trailer). The highest-fidelity
// HONEST signal is the AI tool's own record of what it wrote. This reads a Claude Code transcript
// (the assistant's Write/Edit tool calls), and records the repo files the AI authored content in as
// span attestations (source: claude-code-session-log) in the .madeby/ manifest (#2 format) — the
// recall the trailers missed, as evidence rather than a noisy heuristic. v0 is file-level.
//
// This is also the reference EMITTER: the .madeby manifest is the vendor-neutral contract any tool
// or hook can fill (ship to the tools, not wait for them — review "what's missing").
//
// Usage:  node scripts/capture-session-spans.mjs <transcript.jsonl> [commit]   (commit default HEAD)
//   transcript path optional — best-effort autodiscovery of the newest session for this repo.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();
const repoRoot = git("rev-parse", "--show-toplevel");

function autodiscoverTranscript() {
  const enc = repoRoot.replace(/[/_]/g, "-"); // Claude Code encodes the project path this way
  const dir = join(homedir(), ".claude", "projects", enc);
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => join(dir, f));
    return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null;
  } catch {
    return null;
  }
}

const transcript = process.argv[2] ?? autodiscoverTranscript();
if (!transcript || !existsSync(transcript)) {
  console.error("transcript not found — pass the path: node scripts/capture-session-spans.mjs <transcript.jsonl> [commit]");
  process.exit(1);
}
const commit = git("rev-parse", process.argv[3] ?? "HEAD");

// Extract the repo-relative files the AI Wrote/Edited, with the model that did it.
const WRITE_TOOLS = new Set(["Write", "Edit", "NotebookEdit", "MultiEdit"]);
const byPath = new Map(); // relPath -> Set(model)
for (const line of readFileSync(transcript, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let rec;
  try {
    rec = JSON.parse(line);
  } catch {
    continue;
  }
  if (rec.type !== "assistant" || !rec.message?.content) continue;
  const model = rec.message.model ?? "claude";
  for (const block of rec.message.content) {
    if (block?.type !== "tool_use" || !WRITE_TOOLS.has(block.name)) continue;
    const fp = block.input?.file_path;
    if (typeof fp !== "string" || !fp.startsWith(repoRoot + "/")) continue;
    const rel = fp.slice(repoRoot.length + 1);
    if (rel.startsWith(".madeby/") || rel.includes("node_modules/")) continue; // don't attest our own records
    (byPath.get(rel) ?? byPath.set(rel, new Set()).get(rel)).add(model);
  }
}

// Build session-log attestations for files that still exist at the target commit.
const attestations = [];
for (const [rel, models] of byPath) {
  let blob;
  try {
    blob = git("rev-parse", `${commit}:${rel}`);
  } catch {
    continue; // not present at this commit
  }
  for (const model of models) {
    attestations.push({
      anchor: { fingerprint: { algorithm: "git-blob-sha1", target: "FILE", value: blob }, hint: { path: rel } },
      attribution: { provider: "anthropic", model, operatorId: git("show", "-s", "--format=%ae", commit), source: "claude-code-session-log" },
    });
  }
}

if (attestations.length === 0) {
  console.log("No AI-authored repo files found in the transcript for this commit — nothing to record.");
  process.exit(0);
}

// Merge: keep any non-session-log attestations already recorded; replace session-log ones.
const out = join(repoRoot, ".madeby", "spans", `${commit}.json`);
let existing = [];
if (existsSync(out)) {
  try {
    existing = (JSON.parse(readFileSync(out, "utf8")).attestations ?? []).filter(
      (a) => a?.attribution?.source !== "claude-code-session-log",
    );
  } catch {
    /* overwrite a malformed manifest */
  }
}
const manifest = { version: "0", commit, generatedAt: new Date().toISOString(), attestations: [...existing, ...attestations] };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${out} — ${attestations.length} witnessed span attestation(s) across ${byPath.size} files (source: claude-code-session-log)`);
