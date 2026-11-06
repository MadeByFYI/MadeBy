// Disclosure after the fact — reading disclosure commits (LATE-DISCLOSURE.md, ACO §5). A disclosure
// commit is an EMPTY commit whose `Discloses: <hash>` lines name earlier commits and whose ACO trailers
// say who wrote them. It lets a developer disclose without rewriting history (no amend, no rebase), it
// is reviewed like any commit, and it travels with the branch.
//
// The rules, applied here once for check, coverage and who:
// - it describes only the past: a named commit counts only if it is an ancestor of the disclosure;
// - your own commits only: the named commit's author email must match the disclosure's;
// - the commit's own message comes first: a disclosure commit only fills in one that discloses nothing;
// - a later disclosure commit corrects an earlier one for the same commit;
// - it isn't authored work itself: an empty disclosure commit isn't scored; one that changes content
//   is an ordinary commit and its `Discloses:` lines are ignored.

import { execFileSync } from "node:child_process";
import type { CommitMeta } from "@madeby/classify";
import { disclosedTargets, disclosureCommitTrailers, hasAuthorshipDisclosure } from "@madeby/core";

const FIELD = "\x1f";
const RECORD = "\x1e";

/** A disclosure that applies to one commit, from the disclosure commit `via`. */
export interface LateDisclosure {
  /** the disclosure commit's full hash */
  via: string;
  /** the ACO trailer lines it carries */
  trailers: string;
}

/** A commit a disclosure commit names but that it can't disclose, and why. */
export interface RejectedDisclosure {
  sha: string;
  via: string;
  reason: "not-an-ancestor" | "other-author" | "unknown-commit";
}

export interface DisclosureCommits {
  /** named commit → the disclosure that applies to it (the newest disclosure commit wins) */
  applied: Map<string, LateDisclosure>;
  /** the empty disclosure commits themselves (metadata — not scored as authored work) */
  disclosureCommits: Set<string>;
  rejected: RejectedDisclosure[];
}

const git = (root: string, args: string[]): string | null => {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

/** The tip a range or revision reaches: `a..b` → b, `a...b` → b, `rev` → rev; empty → HEAD. */
export function rangeHead(range?: string): string {
  if (!range) return "HEAD";
  const parts = range.split(/\.{2,3}/);
  return parts[parts.length - 1] || "HEAD";
}

/**
 * Find the disclosure commits reachable from `head` and work out which commits each one discloses.
 * Never throws: unreadable history ⇒ nothing applied (fail safe — a commit stays unknown).
 */
export function readDisclosureCommits(root: string, head = "HEAD"): DisclosureCommits {
  const out: DisclosureCommits = { applied: new Map(), disclosureCommits: new Set(), rejected: [] };
  const log = git(root, ["log", "--no-merges", "-E", "--grep=^[ \t]*Discloses[ \t]*:[ \t]*[0-9a-f]{40}", `--format=%H${FIELD}%ae${FIELD}%B${RECORD}`, head]);
  if (!log) return out;
  const candidates = log
    .split(RECORD)
    .map((r) => r.replace(/^\s+/, ""))
    .filter(Boolean)
    .map((r) => {
      const [sha = "", email = "", ...msg] = r.split(FIELD);
      return { sha, email: email.toLowerCase(), message: msg.join(FIELD) };
    });

  for (const d of candidates) {
    // newest first, so the first disclosure seen for a commit is the latest (a correction wins)
    const targets = disclosedTargets(d.message);
    if (targets.length === 0) continue;
    const changed = git(root, ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", d.sha]);
    if (changed === null || changed.trim() !== "") continue; // content of its own ⇒ an ordinary commit
    out.disclosureCommits.add(d.sha);
    const trailers = disclosureCommitTrailers(d.message);
    const emails = new Map<string, string>();
    // one call for all; if any hash is unknown git fails the lot, so fall back to one at a time
    const shown = git(root, ["show", "-s", "--format=%H %ae", ...targets]) ?? targets.map((t) => git(root, ["show", "-s", "--format=%H %ae", t]) ?? "").join("\n");
    for (const line of shown.split("\n")) {
      const [sha, email] = line.trim().split(" ");
      if (sha && email !== undefined) emails.set(sha, email.toLowerCase());
    }
    for (const t of targets) {
      if (out.applied.has(t)) continue;
      const email = emails.get(t);
      if (email === undefined) out.rejected.push({ sha: t, via: d.sha, reason: "unknown-commit" });
      else if (email !== d.email) out.rejected.push({ sha: t, via: d.sha, reason: "other-author" });
      else if (git(root, ["merge-base", "--is-ancestor", t, d.sha]) === null) out.rejected.push({ sha: t, via: d.sha, reason: "not-an-ancestor" });
      else out.applied.set(t, { via: d.sha, trailers });
    }
  }
  return out;
}

/** A commit with any late disclosure applied: `late` names the disclosure commit when one filled it in. */
export type LateAppliedCommit = CommitMeta & { late?: string };

/**
 * Apply disclosure commits to a list of commits: drop the disclosure commits themselves (metadata, not
 * authored work), and give each undisclosed commit the disclosure that names it. A commit whose own
 * message already discloses keeps it — the message comes first.
 */
export function applyLateDisclosures(commits: readonly CommitMeta[], d: DisclosureCommits): LateAppliedCommit[] {
  const out: LateAppliedCommit[] = [];
  for (const c of commits) {
    const sha = (c.sha ?? "").toLowerCase();
    if (d.disclosureCommits.has(sha)) continue;
    const late = d.applied.get(sha);
    if (late && !hasAuthorshipDisclosure(c.message)) out.push({ ...c, message: `${c.message}\n\n${late.trailers}`, late: late.via });
    else out.push(c);
  }
  return out;
}
