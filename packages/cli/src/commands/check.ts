// `madeby check [<range>] [--json]` — the OSS-maintainer disclosure gate. Reads .madeby/policy.json,
// evaluates each commit's recognized disclosure (AI trailer / DCO sign-off / signature) against it,
// and exits non-zero only under `mode: required`. Fail-safe: a missing/malformed policy degrades to
// `off`, so we never block a PR on our own error and never invent a stricter gate than the maintainer
// wrote. It is one opinionated composition of the recognizer + evaluator primitives (@madeby/core);
// `madeby recognize` exposes the raw recognizer for building your own gate/view.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readGitLog } from "@madeby/analyzer";
import { commitDisclosureKinds, parseDisclosurePolicy, evaluateDisclosurePolicy, DEFAULT_POLICY } from "@madeby/core";
import { repoRoot, resolveRange } from "../scope";

export function checkCommand(args: string[]): void {
  const json = args.includes("--json");
  const explicit = args.find((a) => !a.startsWith("--"));

  const root = repoRoot();
  if (!root) {
    console.error("madeby check: not a git repository.");
    process.exit(2);
    return;
  }

  // An explicit range wins; otherwise auto-scope to the PR from the CI env via the host adapters
  // (GitHub, Azure DevOps, …). No CI / no match ⇒ recent history. (ARCHITECTURE §12.)
  const { range, autoHost } = resolveRange(explicit);

  const policyPath = join(root, ".madeby", "policy.json");
  let policy = DEFAULT_POLICY;
  let policyWarning: string | undefined;
  if (existsSync(policyPath)) {
    try {
      policy = parseDisclosurePolicy(JSON.parse(readFileSync(policyPath, "utf8")));
    } catch {
      policyWarning = ".madeby/policy.json is not valid JSON — treating as no policy (off).";
    }
  }

  const commits = readGitLog(root, range ? undefined : 200, range);
  const disclosures = commits.map((c) => ({
    ref: (c.sha ?? "").slice(0, 8) || "(unknown)",
    kinds: commitDisclosureKinds({ message: c.message, signed: c.signed }),
  }));
  const result = evaluateDisclosurePolicy(policy, disclosures);
  const subjectFor = (ref: string) => commits.find((c) => (c.sha ?? "").startsWith(ref))?.message.split("\n")[0] ?? "";

  if (json) {
    console.log(
      JSON.stringify(
        {
          range: range ?? null,
          autoHost: autoHost ?? null,
          mode: policy.mode,
          pass: result.pass,
          summary: result.summary,
          total: disclosures.length,
          undisclosed: result.nonCompliant.map((v) => ({ ref: v.ref, subject: subjectFor(v.ref) })),
          ...(policyWarning ? { warning: policyWarning } : {}),
        },
        null,
        2,
      ),
    );
    process.exit(result.pass ? 0 : 1);
    return;
  }

  if (policyWarning) console.warn(`madeby check: ${policyWarning}`);
  if (autoHost) console.log(`madeby check: auto-scoped to the ${autoHost} PR range.`);
  console.log(`madeby check — ${result.summary}`);

  if (result.nonCompliant.length && policy.mode !== "off") {
    console.log(`\nUndisclosed commits (${result.nonCompliant.length}):`);
    for (const v of result.nonCompliant.slice(0, 20)) {
      console.log(`  ✗ ${v.ref}  ${subjectFor(v.ref).slice(0, 60)}`);
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
