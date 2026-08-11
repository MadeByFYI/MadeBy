// `madeby check [<range>]` — the OSS-maintainer disclosure gate. Reads .madeby/policy.json, evaluates
// each commit's recognized disclosure (AI trailer / DCO sign-off / signature) against it, and exits
// non-zero only under `mode: required`. Fail-safe: a missing/malformed policy degrades to `off`, so
// we never block a PR on our own error and never invent a stricter gate than the maintainer wrote.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readGitLog } from "@madeby/analyzer";
import {
  commitDisclosureKinds,
  parseDisclosurePolicy,
  evaluateDisclosurePolicy,
  DEFAULT_POLICY,
} from "@madeby/core";

export function checkCommand(args: string[]): void {
  const range = args[0];
  const git = (...a: string[]) =>
    execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();

  let repoRoot: string;
  try {
    repoRoot = git("rev-parse", "--show-toplevel");
  } catch {
    console.error("madeby check: not a git repository.");
    process.exit(2);
    return;
  }

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
      `\nTo disclose: add a Co-Authored-By / Generated-by trailer, a DCO Signed-off-by, sign the commit,` +
        ` or attest with 'madeby prove'. (Disclosure, not a ban — what this project requires is set in .madeby/policy.json.)`,
    );
  }

  // `required` gates; `advisory`/`off` only report. Never exit non-zero on our own error.
  process.exit(result.pass ? 0 : 1);
}
