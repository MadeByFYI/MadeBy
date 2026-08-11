// The `.madeby` disclosure policy + the check evaluator (STRATEGY §3 — the OSS-maintainer wedge).
// A maintainer declares their disclosure policy in-repo (`.madeby/policy.json`); the check reads the
// contributions' recognized disclosure signals and returns a verdict. This is pure, node-free logic
// so it runs anywhere — a contributor's laptop, one line in any CI, or the thin GitHub Action —
// with no hosted backend. The file is the carrier; we detect and evaluate, we don't host.
//
// Disclosure, never detection: the policy asks contributors to STATE their origin (a trailer, a DCO
// sign-off, a signature, a declaration). It never asserts whether code is AI. What a maintainer does
// with a failing check — advise, or block — is THEIR policy; we ship the neutral instrument.

import type { DisclosureKind } from "./disclosure";

export type PolicyMode = "required" | "advisory" | "off";

export interface DisclosurePolicy {
  version: number;
  /** required = fail non-disclosing commits; advisory = report only; off = no gate */
  mode: PolicyMode;
  /**
   * The disclosure kinds that SATISFY the policy. Omitted/empty = any recognized disclosure signal
   * counts (the maintainer just wants origin disclosed, by whatever means).
   */
  accept?: DisclosureKind[];
}

/** The safe default: no gate. A missing or malformed policy degrades to this (never blocks on our bug). */
export const DEFAULT_POLICY: DisclosurePolicy = { version: 0, mode: "off" };

const MODES: readonly PolicyMode[] = ["required", "advisory", "off"];

/**
 * Parse + normalize a policy from untrusted JSON. Fail-safe: anything unrecognized degrades to
 * `off` (advisory-or-nothing) — we never fabricate a stricter gate than the maintainer wrote, and
 * we never block a PR because our parser choked.
 */
export function parseDisclosurePolicy(input: unknown): DisclosurePolicy {
  if (!input || typeof input !== "object") return DEFAULT_POLICY;
  const o = input as Record<string, unknown>;
  const mode = MODES.includes(o.mode as PolicyMode) ? (o.mode as PolicyMode) : "off";
  const version = typeof o.version === "number" ? o.version : 0;
  const accept = Array.isArray(o.accept)
    ? (o.accept.filter((k) => typeof k === "string") as DisclosureKind[])
    : undefined;
  return accept && accept.length > 0 ? { version, mode, accept } : { version, mode };
}

/** A contribution under evaluation: a ref (sha/short id) + the disclosure kinds it carries. */
export interface CommitDisclosure {
  ref: string;
  kinds: DisclosureKind[];
}

export interface CommitVerdict {
  ref: string;
  compliant: boolean;
  /** the accepted kinds this commit actually had (empty ⇒ non-compliant) */
  satisfiedBy: DisclosureKind[];
}

export interface PolicyEvaluation {
  mode: PolicyMode;
  /** the gate result: true ⇒ CI passes. Only `required` mode can produce a false. */
  pass: boolean;
  total: number;
  compliant: number;
  /** commits that disclosed nothing the policy accepts (the actionable list) */
  nonCompliant: CommitVerdict[];
  summary: string;
}

/**
 * Evaluate a policy against a set of contributions. A commit is compliant iff it carries at least
 * one accepted disclosure kind (any recognized kind, when `accept` is unset). `required` fails the
 * gate on any non-compliant commit; `advisory`/`off` always pass (report only). Fail-safe: an empty
 * commit set passes (nothing to gate).
 */
export function evaluateDisclosurePolicy(
  policy: DisclosurePolicy,
  commits: readonly CommitDisclosure[],
): PolicyEvaluation {
  const accept = policy.accept; // undefined ⇒ any kind counts
  const isAccepted = (k: DisclosureKind) => !accept || accept.includes(k);

  const verdicts: CommitVerdict[] = commits.map((c) => {
    const satisfiedBy = c.kinds.filter(isAccepted);
    return { ref: c.ref, compliant: satisfiedBy.length > 0, satisfiedBy };
  });

  const nonCompliant = verdicts.filter((v) => !v.compliant);
  const compliant = verdicts.length - nonCompliant.length;
  const pass = policy.mode !== "required" || nonCompliant.length === 0;

  const wanted = accept ? accept.join(", ") : "any recognized disclosure";
  const summary =
    policy.mode === "off"
      ? `No disclosure policy in effect (${compliant}/${verdicts.length} commits disclose origin).`
      : `${compliant}/${verdicts.length} commits disclose origin (${policy.mode}; accepts: ${wanted}).` +
        (nonCompliant.length ? ` ${nonCompliant.length} undisclosed.` : "");

  return { mode: policy.mode, pass, total: verdicts.length, compliant, nonCompliant, summary };
}
