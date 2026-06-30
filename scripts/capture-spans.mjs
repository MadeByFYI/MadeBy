#!/usr/bin/env node
// Dogfood Phase 0 (#2) — capture span attestations for a commit into the .madeby/ sidecar.
//
// v0 granularity is FILE-level: for an AI-assisted commit, each added/modified file gets a span
// attestation anchored by its git blob SHA, attributing the AI model (from the Co-Authored-By
// trailer) under the committer as operator. This is honest — it records "AI assisted this file
// under operator X", not a fabricated percentage. Line-level spans from Claude Code session logs
// are the documented next refinement (see PROVENANCE.md). Output is validated by
// @madeby/core's parseSpanManifest. No service dependencies.
//
// Usage:  node scripts/capture-spans.mjs [commit]   (default: HEAD)

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const git = (...args) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { encoding: "utf8" }).trim();

// Mirror @madeby/classify's open provider list (kept in sync deliberately; see PROVENANCE.md).
const AI_PATTERNS = [
  { re: /claude/i, provider: "anthropic", model: "claude" },
  { re: /copilot/i, provider: "github-copilot", model: "copilot" },
  { re: /\bcursor\b/i, provider: "cursor", model: "cursor" },
  { re: /\bdevin\b/i, provider: "cognition", model: "devin" },
  { re: /gemini/i, provider: "google", model: "gemini" },
  { re: /chatgpt|openai|codex|\bgpt-/i, provider: "openai", model: "gpt" },
];

const commit = git("rev-parse", process.argv[2] ?? "HEAD");
const body = git("show", "-s", "--format=%B", commit);
const operatorId = git("show", "-s", "--format=%ae", commit);

const trailers = [...body.matchAll(/^[ \t]*Co-authored-by:[ \t]*(.+)$/gim)].map((m) => m[1].trim());
const aiContributors = [];
for (const who of trailers) {
  const p = AI_PATTERNS.find((p) => p.re.test(who));
  if (p) aiContributors.push({ provider: p.provider, model: p.model });
}

if (aiContributors.length === 0) {
  console.log(`commit ${commit.slice(0, 12)} has no AI co-author trailer — nothing to attest (honest human-only commit).`);
  process.exit(0);
}

// Added/modified files at this commit (deletions have no blob to anchor).
const files = git("diff-tree", "--no-commit-id", "-r", "--diff-filter=AM", "--name-only", commit)
  .split("\n")
  .filter(Boolean);

const attestations = [];
for (const path of files) {
  let blob;
  try {
    blob = git("rev-parse", `${commit}:${path}`);
  } catch {
    continue; // not present at this commit
  }
  for (const ai of aiContributors) {
    attestations.push({
      anchor: { fingerprint: { algorithm: "git-blob-sha1", target: "FILE", value: blob }, hint: { path } },
      attribution: { provider: ai.provider, model: ai.model, operatorId, source: "git-commit-trailer-v0" },
    });
  }
}

const manifest = { version: "0", commit, generatedAt: new Date().toISOString(), attestations };
const out = `.madeby/spans/${commit}.json`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${out} — ${attestations.length} file-level span attestation(s), operator ${operatorId}`);
