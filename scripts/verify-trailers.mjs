#!/usr/bin/env node
// Dogfood Phase 0 (#2) — verify commit-level provenance trailers.
//
// Checks that every `Co-Authored-By:` trailer is well-formed (`Name <email>`) and reports the
// commit-level human/AI split (mirrors @madeby/classify's convention). Exits non-zero if any
// trailer is malformed. No service dependencies.
//
// Usage:  node scripts/verify-trailers.mjs [git-range]   (default: all non-merge commits)

import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { encoding: "utf8" });

const range = process.argv[2];
const shas = git("log", "--no-merges", "--format=%H", ...(range ? [range] : []))
  .split("\n")
  .filter(Boolean);

const AI = [/claude/i, /copilot/i, /\bcursor\b/i, /\bdevin\b/i, /gemini/i, /chatgpt|openai|codex|\bgpt-/i];
const TRAILER = /^[ \t]*Co-authored-by:[ \t]*(.+)$/gim;
const WELL_FORMED = /^.+\s+<[^>]+>$/;

let human = 0, withAi = 0, ai = 0, malformed = 0;
for (const sha of shas) {
  const body = git("show", "-s", "--format=%B", sha);
  const authorLine = git("show", "-s", "--format=%an <%ae>", sha).trim();
  const coauthors = [...body.matchAll(TRAILER)].map((m) => m[1].trim());

  for (const who of coauthors) {
    if (!WELL_FORMED.test(who)) {
      console.error(`✗ ${sha.slice(0, 12)} malformed Co-Authored-By: "${who}"`);
      malformed++;
    }
  }

  const aiCoauthor = coauthors.some((w) => AI.some((re) => re.test(w)));
  const aiAuthor = AI.some((re) => re.test(authorLine));
  if (aiAuthor && !aiCoauthor && coauthors.length === 0) ai++;
  else if (aiCoauthor) withAi++;
  else human++;
}

console.log(`\nScanned ${shas.length} non-merge commits — human: ${human} · with_ai: ${withAi} · ai: ${ai}`);
if (malformed > 0) {
  console.error(`\n${malformed} malformed trailer(s) — fix before merging.`);
  process.exit(1);
}
console.log("All Co-Authored-By trailers are well-formed. ✓");
