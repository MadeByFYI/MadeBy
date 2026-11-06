// `madeby check [<range>] [--json]` — the OSS-maintainer disclosure gate. Evaluates each commit's
// recognized disclosure against `.madeby/policy.json` and exits non-zero only under `mode: required`.
// The policy file is optional — with none (or a malformed one) it degrades to `advisory`, so we
// never block a PR on our own error
// and never invent a stricter gate than the maintainer wrote. A thin renderer over the shared
// `evaluateRepoDisclosure` library primitive; `@madeby/core`'s `commitDisclosureKinds` is the raw recognizer.

import { detectCiPullRequest, evaluateRepoDisclosure, historyProblem } from "@madeby/analyzer";
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

  // The history must be here to be scored. A shallow clone, a range endpoint that was never fetched, or
  // a PR build whose range can't be read would otherwise score whatever is present — or nothing — and
  // pass. That's a pipeline problem, not ours, so `required` fails on it (never a false pass) and
  // `advisory` warns loudly.
  const prHost = explicit || autoHost ? null : detectCiPullRequest();
  const problem = prHost
    ? `this is a ${prHost} pull-request build, but its commit range couldn't be read from the CI environment. Pass the range explicitly: madeby check <base>..<head>`
    : historyProblem(root, range);
  const blocked = problem !== null && result.mode === "required";
  const pass = result.pass && !blocked;

  if (json) {
    console.log(JSON.stringify({ range: range ?? null, autoHost: autoHost ?? null, ...result, pass, ...(problem ? { historyProblem: problem } : {}) }, null, 2));
    process.exit(pass ? 0 : 1);
    return;
  }

  if (problem) {
    const banner = blocked ? "FAILED — can't check this history" : "WARNING — this result may be wrong";
    console.error(`\nmadeby check: ${banner}: ${problem}\n`);
  }
  if (blocked) {
    process.exit(1);
    return;
  }
  if (result.warning) console.warn(`madeby check: ${result.warning}`);
  if (autoHost) console.log(`madeby check: auto-scoped to the ${autoHost} PR range.`);
  console.log(`madeby check — ${result.summary}`);

  if (result.undisclosed.length) {
    console.log(`\nUndisclosed commits (${result.undisclosed.length}):`);
    for (const v of result.undisclosed.slice(0, 20)) {
      console.log(`  ✗ ${v.ref}  ${v.subject.slice(0, 60)}`);
    }
    if (result.undisclosed.length > 20) console.log(`  … and ${result.undisclosed.length - 20} more`);
    const why = { "other-author": "it names another author's commit", "not-an-ancestor": "it names a commit that isn't before it", "unknown-commit": "it names a commit that isn't here" };
    for (const r of result.lateRejected.slice(0, 20)) {
      console.log(`  ! ${r.sha.slice(0, 8)} is named by disclosure commit ${r.via.slice(0, 8)}, which can't disclose it: ${why[r.reason]}.`);
    }
    console.log(
      `\nTo disclose who wrote it: 'madeby ai <tool>' (an AI wrote it), 'madeby me --with-ai <tool>' (you, with AI),` +
        ` or 'madeby me' (you alone); a Co-Authored-By trailer naming an AI tool also counts. A DCO sign-off or a` +
        ` signature alone doesn't say who wrote the code. Already pushed, or no amending allowed? Add --for <range>` +
        ` (e.g. madeby me --with-ai <tool> --for origin/main..HEAD): one new commit discloses the earlier ones, nothing rewritten.` +
        ` (Disclosure, not a ban — what this project requires is set in .madeby/policy.json.)`,
    );
  }

  // `required` gates; `advisory` only reports. Never exit non-zero on our own error (a missing history
  // is the pipeline's, handled above).
  process.exit(result.pass ? 0 : 1);
}
