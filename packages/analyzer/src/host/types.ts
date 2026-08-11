import type { IdentityProfile } from "../analyze";

/** A repo coordinate on a host (owner/name). */
export interface RepoRef {
  owner: string;
  name: string;
}

/** Network options for a host's API calls. */
export interface HostApiOptions {
  token: string;
  timeoutMs?: number;
}

/**
 * The seam between MadeBy's git-native trust core and a specific forge (GitHub, Azure DevOps,
 * GitLab, …). The core reads git and is host-agnostic; everything host-specific — how a committer's
 * handle is encoded in their commit email, the profile/reach API, the public link-out URL — lives
 * behind this contract. The GitHub adapter is the reference implementation; a third party registers
 * another through the identical door (ARCHITECTURE §12 — the symmetric plugin model).
 *
 * Identity + enrichment are OPTIONAL capabilities: a host with no adapter (or an adapter without an
 * API) degrades to the email/name identity key and the disclosure gate still works. Nothing here can
 * escalate trust — an adapter only resolves identity/reach; tiers remain the core's to assign (§10).
 */
export interface HostAdapter {
  /** Stable id; namespaces identity keys and caches. e.g. "github". */
  readonly id: string;
  /** Display name. e.g. "GitHub". */
  readonly name: string;

  /**
   * Zero-network: the linkable handle a committer PUBLICLY encoded in their commit email (the host's
   * noreply convention), else null. Never deanonymizes a private email — that is `resolveHandleViaApi`,
   * which is gated on a token + repo.
   */
  handleFromEmail(email?: string): string | null;

  /** The stable identity merge key for a handle on this host. e.g. "gh:jane". */
  handleKey(handle: string): string;

  /** The public web URL for a handle — a link-out pointer, never a hosted profile (point-don't-host). */
  profileUrl(handle: string): string;

  /**
   * Network (optional): resolve a commit email to a handle via the host API — catching the personal
   * emails `handleFromEmail` cannot. Returns null on any failure (graceful).
   */
  resolveHandleViaApi?(repo: RepoRef, email: string, opts: HostApiOptions): Promise<string | null>;

  /** Network (optional): fetch a profile + reach card for a handle. Returns null on any failure. */
  fetchProfile?(handle: string, opts: HostApiOptions): Promise<IdentityProfile | null>;

  /**
   * Optional: compute the PR's commit range (`base..head`) from THIS host's CI environment, else null
   * when not in that host's PR CI. This is the CI-wrapper slice of the host adapter (ARCHITECTURE
   * §12): it lets `madeby check` auto-scope to the PR with no range argument and no host-specific glue
   * in the CI YAML — the range logic lives here, once per host. Returning null doubles as "not my CI",
   * so a detector can try each adapter and take the first hit.
   */
  ciRange?(env: Record<string, string | undefined>): string | null;
}
