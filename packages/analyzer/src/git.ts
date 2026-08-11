// Git history reader (Node-only — uses `git`). Reads commit metadata for the analyzer.
// On-demand cloning of arbitrary public repos is ingestion's job (#10); this reads a repo
// already on disk (or the current one — the dogfood path).

import { execFileSync } from "node:child_process";
import type { CommitMeta } from "@madeby/classify";

// NOTE: never use NUL (\x00) here — Node's execFileSync rejects args containing NUL bytes,
// so every call would throw and (via the catch below) silently return []. Use \x1f.
const FIELD = "\x1f"; // unit separator between fields
const RECORD = "\x1e"; // record separator between commits

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
      "--no-merges", // merge commits aren't authored content — exclude them from attribution
      ...(limit ? ["-n", String(limit)] : []),
      // %G? is a signature-PRESENCE probe for the Disclosure Score: 'N' = unsigned; any other code
      // (G/U/E/…) = a signature is present (E = present but unverifiable here — no keyring). We only
      // read presence, never validity (that's the verified tier). If gpg is absent git returns 'N',
      // which under-counts disclosure — the fail-safe direction (never a false "disclosed").
      `--format=%H${FIELD}%an${FIELD}%ae${FIELD}%G?${FIELD}%B${RECORD}`,
      // optional revision range, e.g. "origin/main..HEAD" — the PR's own commits for the gate
      ...(range ? [range] : []),
    ];
    const out = execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    return out
      .split(RECORD)
      .map((r) => r.replace(/^\s+/, ""))
      .filter((r) => r.length > 0)
      .map((rec) => {
        const parts = rec.split(FIELD);
        const sha = parts[0] ?? "";
        const authorName = parts[1] ?? "";
        const authorEmail = parts[2] ?? "";
        const sig = parts[3] ?? "N";
        const message = parts.slice(4).join(FIELD).trimEnd();
        return { sha, authorName, authorEmail, signed: sig !== "N" && sig !== "", message };
      });
  } catch {
    return [];
  }
}
