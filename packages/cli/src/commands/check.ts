// `madeby check [<range>] [--json]` — the OSS-maintainer disclosure gate. Evaluates each commit's
// recognized disclosure against `.madeby/policy.json` and exits non-zero only under `mode: required`.
// Fail-safe: a missing/malformed policy degrades to `off`, so we never block a PR on our own error
// and never invent a stricter gate than the maintainer wrote. A thin renderer over the shared
// `evaluateRepoDisclosure` library primitive; `madeby recognize` exposes the raw recognizer.

import { evaluateRepoDisclosure } from "@madeby/analyzer";
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
  const result = evaluateRepoDisclosure(root, { range });

  if (json) {
    console.log(JSON.stringify({ range: range ?? null, autoHost: autoHost ?? null, ...result }, null, 2));
    process.exit(result.pass ? 0 : 1);
    return;
  }

  if (result.warning) console.warn(`madeby check: ${result.warning}`);
  if (autoHost) console.log(`madeby check: auto-scoped to the ${autoHost} PR range.`);
  console.log(`madeby check — ${result.summary}`);

  if (result.undisclosed.length && result.mode !== "off") {
    console.log(`\nUndisclosed commits (${result.undisclosed.length}):`);
    for (const v of result.undisclosed.slice(0, 20)) {
      console.log(`  ✗ ${v.ref}  ${v.subject.slice(0, 60)}`);
    }
    if (result.undisclosed.length > 20) console.log(`  … and ${result.undisclosed.length - 20} more`);
    console.log(
      `\nTo disclose: add a Co-Authored-By / Generated-by trailer, a DCO Signed-off-by, sign the commit,` +
        ` or attest with 'madeby prove'. (Disclosure, not a ban — what this project requires is set in .madeby/policy.json.)`,
    );
  }

  // `required` gates; `advisory`/`off` only report. Never exit non-zero on our own error.
  process.exit(result.pass ? 0 : 1);
}
