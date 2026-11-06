// The disclosure primitives as LIBRARY functions — the shared implementation behind `madeby check`
// and the MCP server (ARCHITECTURE §12, "primitives you run"). We READ, never detect: the author
// writes the disclosure into the commit (a trailer, a sign-off, a signature) and we read it back —
// `readDisclosures` reads what each commit declares; `evaluateRepoDisclosure` reads then evaluates
// against the policy. Composing @madeby/analyzer's git read with @madeby/core's disclosure vocabulary
// + policy evaluator, returning plain data (no rendering, no process.exit) so any surface — CLI, MCP
// tool, a third party's own runtime — consumes the same result.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  commitDisclosureKinds,
  parseDisclosurePolicy,
  evaluateDisclosurePolicy,
  DEFAULT_POLICY,
  type DisclosureKind,
} from "@madeby/core";
import { readGitLog } from "./git";
import { applyLateDisclosures, rangeHead, readDisclosureCommits, type RejectedDisclosure } from "./late-disclosure";

export interface DisclosedCommit {
  /** full commit sha */
  sha: string;
  /** first line of the message */
  subject: string;
  /** the disclosure kinds this commit declares (empty ⇒ undisclosed) */
  disclosures: DisclosureKind[];
  /** set when a later disclosure commit supplied the disclosure: that commit's hash */
  late?: string;
}

/**
 * Read what each commit DECLARES about its origin — in its own message or in a later disclosure commit
 * that names it — no policy applied, no inference. Reads git; never throws (→ []).
 */
export function readDisclosures(root: string, opts: { range?: string; limit?: number } = {}): DisclosedCommit[] {
  return readDisclosuresWithRejects(root, opts).commits;
}

function readDisclosuresWithRejects(root: string, opts: { range?: string; limit?: number }): { commits: DisclosedCommit[]; rejected: RejectedDisclosure[] } {
  const late = readDisclosureCommits(root, rangeHead(opts.range));
  const commits = applyLateDisclosures(readGitLog(root, opts.range ? undefined : opts.limit ?? 200, opts.range), late);
  return {
    commits: commits.map((c) => ({
      sha: c.sha ?? "",
      subject: c.message.split("\n")[0] ?? "",
      disclosures: commitDisclosureKinds({ message: c.message, signed: c.signed }),
      ...(c.late ? { late: c.late } : {}),
    })),
    rejected: late.rejected,
  };
}

export interface RepoDisclosure {
  /** the policy mode in effect (fail-safe: missing/invalid → the default) */
  mode: string;
  pass: boolean;
  summary: string;
  total: number;
  undisclosed: { ref: string; subject: string }[];
  /** commits in scope a disclosure commit named but couldn't disclose (another author's, not an ancestor) */
  lateRejected: RejectedDisclosure[];
  /** present when the policy file was unreadable and we degraded to the default */
  warning?: string;
}

// Evaluate a repo's commits against its `.madeby/policy.json` — the gate, as data. Fail-safe. The
// policy file is OPTIONAL: with no file, the default is advisory (report-only), so `check` is useful
// with zero config — you only add the file to go `required`.
export function evaluateRepoDisclosure(root: string, opts: { range?: string; limit?: number } = {}): RepoDisclosure {
  let policy = DEFAULT_POLICY;
  let warning: string | undefined;
  const policyPath = join(root, ".madeby", "policy.json");
  if (existsSync(policyPath)) {
    try {
      policy = parseDisclosurePolicy(JSON.parse(readFileSync(policyPath, "utf8")));
    } catch {
      warning = ".madeby/policy.json is not valid JSON — degrading to advisory (report-only, never blocks).";
    }
  }
  const { commits, rejected } = readDisclosuresWithRejects(root, opts);
  const disclosures = commits.map((c) => ({ ref: (c.sha || "").slice(0, 8) || "(unknown)", kinds: c.disclosures }));
  const result = evaluateDisclosurePolicy(policy, disclosures);
  const subjectFor = (ref: string) => commits.find((c) => (c.sha || "").startsWith(ref))?.subject ?? "";
  return {
    mode: policy.mode,
    pass: result.pass,
    summary: result.summary,
    total: disclosures.length,
    undisclosed: result.nonCompliant.map((v) => ({ ref: v.ref, subject: subjectFor(v.ref) })),
    lateRejected: rejected.filter((r) => commits.some((c) => c.sha === r.sha)),
    ...(warning ? { warning } : {}),
  };
}
