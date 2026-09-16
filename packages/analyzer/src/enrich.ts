// Tier-2 of "the how": on-demand host-API enrichment of a resolved handle → real name + reach ("this
// was made by a real person who also maintains X (21k★)"). Now HOST-AGNOSTIC (ARCHITECTURE §12): the
// forge-specific fetches live in the host adapter; this file is the bounded, gracefully-degrading
// orchestration around whatever adapter is in play (default: GitHub). Asker-pull, NO store — just a
// token + a network call in the request path.
//
// Guards unchanged: only PUBLICLY-linked handles are enriched (never a private email beyond the
// adapter's own commits-API resolution); only the TOP-N human contributors are enriched (bounds API
// budget + latency); any failure degrades to the un-enriched read — enrichment never fails analysis.

import type { Contributor, IdentityProfile } from "./analyze";
import { githubAdapter } from "./host/github";
import type { HostAdapter } from "./host/types";

// In-memory TTL cache — the same maintainers/handles recur across analyses, so a warm cache slashes
// API calls (rate budget) and latency. Per-process (resets on deploy). Keys are namespaced by
// adapter id so multi-host lookups never collide.
const TTL_MS = 6 * 60 * 60 * 1000; // 6h — handles/reach are stable at this granularity
interface Cached<T> {
  value: T;
  expires: number;
}
function memo<T>(cache: Map<string, Cached<T>>, key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  return fetcher().then((value) => {
    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  });
}
const profileCache = new Map<string, Cached<IdentityProfile | null>>();
const handleCache = new Map<string, Cached<string | null>>();

export interface EnrichOptions {
  /** a host token; absent ⇒ resolution/enrichment is skipped and contributors returned unchanged */
  token?: string;
  /** the repo, so we can resolve personal-email committers to their login via the host API */
  repo?: { owner: string; name: string };
  /** operate on at most the top-N human contributors (bounds API calls + latency) */
  top?: number;
  timeoutMs?: number;
  /** the host adapter to resolve/enrich against (default: GitHub — the reference adapter) */
  adapter?: HostAdapter;
}

/** Fetch a profile + reach for one handle (cached). Returns null on any failure (graceful). */
export function enrichIdentity(
  handle: string,
  opts: { token: string; timeoutMs?: number; adapter?: HostAdapter },
): Promise<IdentityProfile | null> {
  const adapter = opts.adapter ?? githubAdapter;
  if (!adapter.fetchProfile) return Promise.resolve(null);
  return memo(profileCache, `${adapter.id}:${handle.toLowerCase()}`, () =>
    adapter.fetchProfile!(handle, { token: opts.token, timeoutMs: opts.timeoutMs }),
  );
}

/** Resolve one email → handle via the adapter's host API (cached). Null if the adapter can't/​won't. */
function resolveHandleCached(
  adapter: HostAdapter,
  repo: { owner: string; name: string },
  email: string,
  opts: { token: string; timeoutMs?: number },
): Promise<string | null> {
  if (!adapter.resolveHandleViaApi) return Promise.resolve(null);
  return memo(handleCache, `${adapter.id}:${repo.owner}/${repo.name}/${email.toLowerCase()}`, () =>
    adapter.resolveHandleViaApi!(repo, email, { token: opts.token, timeoutMs: opts.timeoutMs }),
  );
}

/**
 * Resolve @handles for the top-N human contributors — noreply-derived (already on the contributor,
 * identity.ts) or resolved from the personal email via the host API. Attaches ONLY the handle (a
 * pointer / link-out), fetching no profile. This is the PUBLIC path: we point to the identity where
 * it's disclosed, we don't host a profile (ARCH §1). Bounded; gracefully degrading.
 */
export async function resolveHandles(contributors: Contributor[], opts: EnrichOptions = {}): Promise<Contributor[]> {
  const { token, repo } = opts;
  const adapter = opts.adapter ?? githubAdapter;
  let withHandles = contributors;
  if (token && repo) {
    const targets = contributors.filter((c) => c.kind === "human" && !c.handle && c.detail).slice(0, opts.top ?? 5);
    const resolved = await Promise.all(
      targets.map(async (c) => {
        const handle = await resolveHandleCached(adapter, repo, c.detail!, { token, timeoutMs: opts.timeoutMs });
        return handle ? ([c, handle] as const) : null;
      }),
    );
    const byC = new Map<Contributor, string>();
    for (const r of resolved) if (r) byC.set(r[0], r[1]);
    if (byC.size) withHandles = contributors.map((c) => (byC.has(c) ? { ...c, handle: byC.get(c)! } : c));
  }
  // Merge git-identities that resolved to the SAME handle (a person split across personal emails) —
  // accurate concentration. Runs even without a token (merges noreply-derived handles, identity.ts).
  return mergeByResolvedHandle(withHandles, adapter);
}

/** Combine human contributors that now share a resolved handle; sum commits, keep the top name. */
function mergeByResolvedHandle(contributors: Contributor[], adapter: HostAdapter): Contributor[] {
  const merged = new Map<string, Contributor>();
  const topSingle = new Map<string, number>();
  const passthrough: Contributor[] = [];
  for (const c of contributors) {
    const key = c.kind === "human" && c.handle ? adapter.handleKey(c.handle) : null;
    if (!key) {
      passthrough.push(c);
      continue;
    }
    const ex = merged.get(key);
    if (ex) {
      ex.commits += c.commits;
      if (c.commits > (topSingle.get(key) ?? 0)) {
        ex.name = c.name;
        topSingle.set(key, c.commits);
      }
    } else {
      merged.set(key, { ...c });
      topSingle.set(key, c.commits);
    }
  }
  return [...merged.values(), ...passthrough].sort((a, b) => b.commits - a.commits);
}

/**
 * Resolve handles AND overlay the full profile/reach card. This is the RELATIONSHIP/CONSENT path
 * (repo owner, enterprise, or a claimed identity) — never the public mirror, which hosts no profile
 * of a stranger. Bounded to the top-N; degrades gracefully on any failure.
 */
export async function enrichContributors(contributors: Contributor[], opts: EnrichOptions = {}): Promise<Contributor[]> {
  const withHandles = await resolveHandles(contributors, opts);
  const token = opts.token;
  const adapter = opts.adapter ?? githubAdapter;
  if (!token || !adapter.fetchProfile) return withHandles;
  const targets = withHandles.filter((c) => c.kind === "human" && c.handle).slice(0, opts.top ?? 5);
  const profiles = await Promise.all(
    targets.map((c) => enrichIdentity(c.handle!, { token, timeoutMs: opts.timeoutMs, adapter })),
  );
  const byC = new Map<Contributor, IdentityProfile>();
  targets.forEach((c, i) => {
    const p = profiles[i];
    if (p) byC.set(c, p);
  });
  return byC.size ? withHandles.map((c) => (byC.has(c) ? { ...c, profile: byC.get(c) } : c)) : withHandles;
}
