// The disclosure primitives as LIBRARY functions — the shared implementation behind `madeby
// recognize`, `madeby check`, and the MCP server (ARCHITECTURE §12, "primitives you run"). Composing
// @madeby/analyzer's git read with @madeby/core's recognizer + policy evaluator, returning plain
// data (no rendering, no process.exit) so any surface — CLI, MCP tool, a third party's own runtime —
// consumes the same result.

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

export interface RecognizedCommit {
  /** full commit sha */
  sha: string;
  /** first line of the message */
  subject: string;
  /** the disclosure kinds this commit carries (empty ⇒ undisclosed) */
  disclosures: DisclosureKind[];
}

/** The raw recognizer over a repo's commits — no policy applied. Reads git; never throws (→ []). */
export function recognizeCommits(root: string, opts: { range?: string; limit?: number } = {}): RecognizedCommit[] {
  const commits = readGitLog(root, opts.range ? undefined : opts.limit ?? 200, opts.range);
  return commits.map((c) => ({
    sha: c.sha ?? "",
    subject: c.message.split("\n")[0] ?? "",
    disclosures: commitDisclosureKinds({ message: c.message, signed: c.signed }),
  }));
}

export interface RepoDisclosure {
  /** the policy mode in effect (fail-safe: missing/invalid → the default) */
  mode: string;
  pass: boolean;
  summary: string;
  total: number;
  undisclosed: { ref: string; subject: string }[];
  /** present when the policy file was unreadable and we degraded to the default */
  warning?: string;
}

/** Evaluate a repo's commits against its `.madeby/policy.json` — the gate, as data. Fail-safe. */
export function evaluateRepoDisclosure(root: string, opts: { range?: string; limit?: number } = {}): RepoDisclosure {
  let policy = DEFAULT_POLICY;
  let warning: string | undefined;
  const policyPath = join(root, ".madeby", "policy.json");
  if (existsSync(policyPath)) {
    try {
      policy = parseDisclosurePolicy(JSON.parse(readFileSync(policyPath, "utf8")));
    } catch {
      warning = ".madeby/policy.json is not valid JSON — treating as no policy (off).";
    }
  }
  const commits = recognizeCommits(root, opts);
  const disclosures = commits.map((c) => ({ ref: (c.sha || "").slice(0, 8) || "(unknown)", kinds: c.disclosures }));
  const result = evaluateDisclosurePolicy(policy, disclosures);
  const subjectFor = (ref: string) => commits.find((c) => (c.sha || "").startsWith(ref))?.subject ?? "";
  return {
    mode: policy.mode,
    pass: result.pass,
    summary: result.summary,
    total: disclosures.length,
    undisclosed: result.nonCompliant.map((v) => ({ ref: v.ref, subject: subjectFor(v.ref) })),
    ...(warning ? { warning } : {}),
  };
}
