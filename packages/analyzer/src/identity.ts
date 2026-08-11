// Identity resolution (the buildable-now slice of "the how"). A bare commit carries a name + email;
// this resolves the committer to a real, linkable GitHub handle WHERE THE COMMITTER PUBLICLY LINKED
// IT — GitHub's noreply email encodes the username: "<id>+<username>@users.noreply.github.com" (or
// the older "<username>@users.noreply.github.com"). So we get the @handle with ZERO network.
//
// Privacy posture: we only read a handle the committer *themselves* put in a public commit's public
// email. We do NOT deanonymize a private/personal email (that needs a lookup + raises consent/PII
// concerns, ARCHITECTURE §8) — absent a public handle, the identity key falls back to the email/name,
// exactly as before. Richer where the maker opted in; never creepier than the raw commit already is.

const NOREPLY = /^(?:(\d+)\+)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))@users\.noreply\.github\.com$/i;

/** The committer's public GitHub handle if their commit email encodes it, else null. Zero-network. */
export function resolveGitHubHandle(email?: string): string | null {
  const m = (email ?? "").trim().match(NOREPLY);
  return m ? m[2]!.toLowerCase() : null;
}

export interface ResolvedIdentity {
  /** stable merge key: the GitHub handle when derivable, else the email, else the name */
  key: string;
  /** the public GitHub handle, when the committer linked it via a noreply email */
  handle?: string;
}

/**
 * Resolve a committer to a merge key (+ handle). Keying by handle merges a person's commits across
 * their noreply-email variants; falling back to email preserves prior behavior. We never merge by
 * name alone (two different "John Smith"s must not collapse).
 */
export function resolveIdentity(name?: string, email?: string): ResolvedIdentity {
  const handle = resolveGitHubHandle(email);
  if (handle) return { key: `gh:${handle}`, handle };
  const e = (email ?? "").trim().toLowerCase();
  return { key: e || (name ?? "").trim() || "unknown" };
}
