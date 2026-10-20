// Git history reader (Node-only — uses `git`). Reads commit metadata for the analyzer.
// On-demand cloning of arbitrary public repos is ingestion's job (#10); this reads a repo
// already on disk (or the current one — the dogfood path).

import { execFileSync } from "node:child_process";
import type { CommitMeta } from "@madeby/classify";

// NOTE: never use NUL (\x00) here — Node's execFileSync rejects args containing NUL bytes,
// so every call would throw and (via the catch below) silently return []. Use \x1f.
const FIELD = "\x1f"; // unit separator between fields
const RECORD = "\x1e"; // record separator between commits
const GROUP = "\x1d"; // ends a commit's message where a file list follows it (readAuthoredMerges)

const parseMeta = (rec: string): CommitMeta => {
  const parts = rec.split(FIELD);
  const sig = parts[3] ?? "N";
  return {
    sha: parts[0] ?? "",
    authorName: parts[1] ?? "",
    authorEmail: parts[2] ?? "",
    signed: sig !== "N" && sig !== "",
    message: parts.slice(4).join(FIELD).trimEnd(),
  };
};

/**
 * Read commit metadata via `git log`. Returns `[]` (never throws) if git or the repo is
 * unavailable, so callers degrade gracefully (the resolver/analyzer "not available" state).
 */
export function readGitLog(repoPath: string, limit?: number, range?: string): CommitMeta[] {
  try {
    const args = [
      "-C",
      repoPath,
      "log",
      "--no-merges", // a merge is not authored content by default; readAuthoredMerges finds those that are
      ...(limit ? ["-n", String(limit)] : []),
      // %G? is a signature-PRESENCE probe for the Disclosure Score: 'N' = unsigned; any other code
      // (G/U/E/…) = a signature is present (E = present but unverifiable here — no keyring). We only
      // read presence, never validity (that's the verified tier). If gpg is absent git returns 'N',
      // which under-counts disclosure — the fail-safe direction (never a false "disclosed").
      `--format=%H${FIELD}%an${FIELD}%ae${FIELD}%G?${FIELD}%B${RECORD}`,
      // optional revision range, e.g. "origin/main..HEAD" — the PR's own commits for the gate
      ...(range ? [range] : []),
    ];
    // Ignore git's stderr: `%G?` triggers signature verification, which floods stderr on SSH-signed
    // repos ("gpg.ssh.allowedSignersFile needs to be configured"). We only read presence from stdout;
    // a real failure still throws (non-zero exit) and is caught below.
    const out = execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    return out
      .split(RECORD)
      .map((r) => r.replace(/^\s+/, ""))
      .filter((r) => r.length > 0)
      .map(parseMeta);
  } catch {
    return [];
  }
}

/**
 * The merge commits that carry content of their own — a conflict resolution or any other change that
 * matches none of the merge's parents (`git log --cc` lists files only for those). A plain merge just
 * joins two histories and authors nothing; these did author something, so coverage scores them like
 * any other commit. Selection is by content, never by disclosure, so it can't bias known vs unknown.
 *
 * Scope mirrors readGitLog: a range is read as-is; otherwise pass `since` (unix seconds, the committer
 * date of the oldest commit in the readGitLog window) to bound it to the same span of history. Returns
 * `[]` (never throws) on any failure — fewer commits scored, never a false disclosure.
 */
export function readAuthoredMerges(repoPath: string, opts: { range?: string; since?: number } = {}): CommitMeta[] {
  try {
    const args = [
      "-C",
      repoPath,
      "log",
      "--merges",
      "--cc",
      "--name-only",
      `--format=${RECORD}%H${FIELD}%an${FIELD}%ae${FIELD}%G?${FIELD}%B${GROUP}`,
      ...(opts.since !== undefined && !opts.range ? [`--since=@${opts.since}`] : []),
      ...(opts.range ? [opts.range] : []),
    ];
    const out = execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    return out
      .split(RECORD)
      .filter((r) => r.includes(GROUP))
      .filter((r) => r.slice(r.lastIndexOf(GROUP) + 1).trim().length > 0) // files of its own ⇒ authored
      .map((r) => parseMeta(r.slice(0, r.lastIndexOf(GROUP))));
  } catch {
    return [];
  }
}

/** Committer date (unix seconds) of a commit, or undefined if unreadable. */
export function commitTime(repoPath: string, sha: string): number | undefined {
  try {
    const t = Number(execFileSync("git", ["-C", repoPath, "log", "-1", "--format=%ct", sha], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
    return Number.isFinite(t) && t > 0 ? t : undefined;
  } catch {
    return undefined;
  }
}
