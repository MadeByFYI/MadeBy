// Identity resolution (the buildable-now slice of "the how"), now behind the host-adapter seam
// (ARCHITECTURE §12). A bare commit carries name + email; an adapter resolves the committer to a
// linkable handle WHERE THE COMMITTER PUBLICLY LINKED IT. GitHub is the default/reference adapter
// (zero-network for the noreply path); pass another adapter to resolve on a different host.
//
// Privacy posture unchanged: we only read a handle the committer themselves put in a public commit's
// public email. Absent a public handle, the key falls back to the email/name (never deanonymized
// here — that needs a token + repo, and is the adapter's networked path).

import { githubAdapter } from "./host/github";
import type { HostAdapter } from "./host/types";

/** Backward-compatible alias: the committer's public GitHub handle from their noreply email, else null. */
export function resolveGitHubHandle(email?: string): string | null {
  return githubAdapter.handleFromEmail(email);
}

export interface ResolvedIdentity {
  /** stable merge key: the host handle when derivable, else the email, else the name */
  key: string;
  /** the public handle, when the committer linked it via the host's noreply convention */
  handle?: string;
}

/**
 * Resolve a committer to a merge key (+ handle) on a host (default: GitHub). Keying by handle merges
 * a person's commits across their noreply-email variants; falling back to email preserves prior
 * behavior. We never merge by name alone (two different "John Smith"s must not collapse).
 */
export function resolveIdentity(name?: string, email?: string, adapter: HostAdapter = githubAdapter): ResolvedIdentity {
  const handle = adapter.handleFromEmail(email);
  if (handle) return { key: adapter.handleKey(handle), handle };
  const e = (email ?? "").trim().toLowerCase();
  return { key: e || (name ?? "").trim() || "unknown" };
}
