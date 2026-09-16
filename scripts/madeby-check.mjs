#!/usr/bin/env node
// `madeby check` — the OSS-maintainer disclosure gate, the light way. It reads the
// repo's `.madeby/policy.json`, recognizes each commit's disclosure signals (AI trailer / DCO
// sign-off / commit signature), and evaluates them against the policy — pass/fail + a summary.
// Runs anywhere with zero hosted infra: a contributor's laptop, or one line in ANY CI
//   node --experimental-strip-types scripts/madeby-check.mjs [<range>]
//   # e.g. in a PR gate:  node ... madeby-check.mjs origin/main..HEAD
// It reuses the SAME recognizer + evaluator the mirror and index use (self-contained @madeby/core
// subpaths, so no bundling is needed to run it under Node's type-stripping).
//
// Disclosure, never detection. Exit code reflects the maintainer's OWN policy: `required` fails on
// undisclosed commits; `advisory`/`off` always exit 0 (report only). What they gate on is their call.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readGitLog } from "../packages/analyzer/src/git.ts";
// Import the self-contained core modules by explicit relative path: scripts/ has no node_modules to
// resolve a bare "@madeby/core" specifier, and these files are type-only internally so type-
// stripping runs them directly (same reason git.ts works here). The ./disclosure + ./policy subpath
// exports exist for bundled consumers.
import { commitDisclosureKinds } from "../packages/core/src/disclosure.ts";
import { parseDisclosurePolicy, evaluateDisclosurePolicy, DEFAULT_POLICY } from "../packages/core/src/policy.ts";

const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();
const repoRoot = git("rev-parse", "--show-toplevel");
const range = process.argv[2]; // optional "base..head"; default = recent history

// Load the maintainer's policy (fail-safe to "off" if absent/malformed — never block on our bug).
const policyPath = join(repoRoot, ".madeby", "policy.json");
let policy = DEFAULT_POLICY;
if (existsSync(policyPath)) {
  try {
    policy = parseDisclosurePolicy(JSON.parse(readFileSync(policyPath, "utf8")));
  } catch {
    console.warn("madeby check: .madeby/policy.json is not valid JSON — treating as no policy (off).");
  }
}

const commits = readGitLog(repoRoot, range ? undefined : 200, range);
const disclosures = commits.map((c) => ({
  ref: (c.sha ?? "").slice(0, 8) || "(unknown)",
  kinds: commitDisclosureKinds({ message: c.message, signed: c.signed }),
}));

const result = evaluateDisclosurePolicy(policy, disclosures);

console.log(`madeby check — ${result.summary}`);
if (result.nonCompliant.length && policy.mode !== "off") {
  console.log(`\nUndisclosed commits (${result.nonCompliant.length}):`);
  for (const v of result.nonCompliant.slice(0, 20)) {
    const subject = commits.find((c) => (c.sha ?? "").startsWith(v.ref))?.message.split("\n")[0] ?? "";
    console.log(`  ✗ ${v.ref}  ${subject.slice(0, 60)}`);
  }
  if (result.nonCompliant.length > 20) console.log(`  … and ${result.nonCompliant.length - 20} more`);
  console.log(
    `\nTo disclose: add a Co-Authored-By / Generated-by trailer, an Authored-by-human trailer ('madeby me'),` +
      ` a DCO Signed-off-by, sign the commit, or record your AI session with 'madeby ai'.` +
      ` (Disclosure, not a ban — what this project requires is set in .madeby/policy.json.)`,
  );
}

// `required` gates the PR; `advisory`/`off` only report. Never throw on our own error → exit 0.
process.exit(result.pass ? 0 : 1);
