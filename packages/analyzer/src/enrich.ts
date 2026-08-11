// Tier-2 of "the how": on-demand GitHub-API enrichment of a resolved handle → the real name + reach
// ("this was made by a real person who also maintains X (21k★)"). Asker-pull, NO store — just a
// token + a network call in the request path, bounded and gracefully degrading.
//
// Guards: only handles the committer PUBLICLY LINKED (from identity.ts) are enriched — never a
// private/personal email (§8). Only the TOP-N human contributors are enriched (bounds API budget +
// latency). Any failure — no token, rate-limited, timeout, down — degrades to the un-enriched read;
// enrichment never fails the analysis.

import type { Contributor, IdentityProfile } from "./analyze";

const GQL =
  "query($login:String!){user(login:$login){name company followers{totalCount} repositories(first:3,ownerAffiliations:OWNER,isFork:false,orderBy:{field:STARGAZERS,direction:DESC}){nodes{name stargazerCount}}}}";

interface GqlUser {
  name: string | null;
  company: string | null;
  followers: { totalCount: number } | null;
  repositories: { nodes: { name: string; stargazerCount: number }[] } | null;
}

const kfmt = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

function reachLine(followers: number | undefined, topRepos: { name: string; stars: number }[]): string | undefined {
  const parts: string[] = [];
  if (followers && followers > 0) parts.push(`${kfmt(followers)} followers`);
  if (topRepos[0]) parts.push(`${topRepos[0].name} (${kfmt(topRepos[0].stars)}★)`);
  return parts.length ? parts.join(" · ") : undefined;
}

// In-memory TTL cache — the same maintainers/handles recur across analyses, so a warm cache slashes
// API calls (rate budget) and latency. Per-process (resets on deploy); good enough for the mirror.
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

/** Fetch a GitHub profile + reach for one handle (cached). Returns null on any failure (graceful). */
export function enrichIdentity(handle: string, opts: { token: string; timeoutMs?: number }): Promise<IdentityProfile | null> {
  return memo(profileCache, handle.toLowerCase(), () => fetchIdentityProfile(handle, opts));
}

async function fetchIdentityProfile(handle: string, opts: { token: string; timeoutMs?: number }): Promise<IdentityProfile | null> {
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${opts.token}`,
        "Content-Type": "application/json",
        "User-Agent": "madeby-analyzer",
      },
      body: JSON.stringify({ query: GQL, variables: { login: handle } }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { user?: GqlUser | null } };
    const u = json.data?.user;
    if (!u) return null;
    const topRepos = (u.repositories?.nodes ?? [])
      .map((n) => ({ name: n.name, stars: n.stargazerCount }))
      .filter((r) => r.stars > 0);
    const followers = u.followers?.totalCount;
    const reach = reachLine(followers, topRepos);
    return {
      handle,
      ...(u.name ? { name: u.name } : {}),
      ...(u.company ? { company: u.company } : {}),
      ...(followers !== undefined ? { followers } : {}),
      topRepos,
      ...(reach ? { reach } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Resolve an email to its GitHub login via the repo's commits API — GitHub knows the linked login
 * even for personal emails (this is how it shows "@login" on a commit). Reaches the established
 * maintainers that noreply-parsing (identity.ts) misses. Returns null on any failure.
 */
function resolveHandleViaCommits(
  owner: string,
  repo: string,
  email: string,
  opts: { token: string; timeoutMs?: number },
): Promise<string | null> {
  return memo(handleCache, `${owner}/${repo}/${email.toLowerCase()}`, () => fetchHandleViaCommits(owner, repo, email, opts));
}

async function fetchHandleViaCommits(
  owner: string,
  repo: string,
  email: string,
  opts: { token: string; timeoutMs?: number },
): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?author=${encodeURIComponent(email)}&per_page=1`;
    const res = await fetch(url, {
      headers: { Authorization: `bearer ${opts.token}`, "User-Agent": "madeby-analyzer", Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as { author?: { login?: string } | null }[];
    return arr[0]?.author?.login ?? null;
  } catch {
    return null;
  }
}

export interface EnrichOptions {
  /** a GitHub token; absent ⇒ resolution/enrichment is skipped and contributors returned unchanged */
  token?: string;
  /** the repo, so we can resolve personal-email committers to their login via the commits API */
  repo?: { owner: string; name: string };
  /** operate on at most the top-N human contributors (bounds API calls + latency) */
  top?: number;
  timeoutMs?: number;
}

/**
 * Resolve @handles for the top-N human contributors — noreply-derived (already on the contributor,
 * identity.ts) or resolved from the personal email via the commits API. Attaches ONLY the handle (a
 * pointer / link-out), fetching no profile. This is the PUBLIC path: we point to the identity where
 * it's disclosed, we don't host a profile (STRATEGY §3, ARCH §1). Bounded; gracefully degrading.
 */
export async function resolveHandles(contributors: Contributor[], opts: EnrichOptions = {}): Promise<Contributor[]> {
  const { token, repo } = opts;
  let withHandles = contributors;
  if (token && repo) {
    const targets = contributors.filter((c) => c.kind === "human" && !c.handle && c.detail).slice(0, opts.top ?? 5);
    const resolved = await Promise.all(
      targets.map(async (c) => {
        const handle = await resolveHandleViaCommits(repo.owner, repo.name, c.detail!, { token, timeoutMs: opts.timeoutMs });
        return handle ? ([c, handle] as const) : null;
      }),
    );
    const byC = new Map<Contributor, string>();
    for (const r of resolved) if (r) byC.set(r[0], r[1]);
    if (byC.size) withHandles = contributors.map((c) => (byC.has(c) ? { ...c, handle: byC.get(c)! } : c));
  }
  // Merge git-identities that resolved to the SAME handle (a person split across personal emails) —
  // accurate concentration. Runs even without a token (merges noreply-derived handles, identity.ts).
  return mergeByResolvedHandle(withHandles);
}

/** Combine human contributors that now share a resolved handle; sum commits, keep the top name. */
function mergeByResolvedHandle(contributors: Contributor[]): Contributor[] {
  const merged = new Map<string, Contributor>();
  const topSingle = new Map<string, number>();
  const passthrough: Contributor[] = [];
  for (const c of contributors) {
    const key = c.kind === "human" && c.handle ? `gh:${c.handle.toLowerCase()}` : null;
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
 * Resolve handles AND overlay the full GitHub profile/reach card. This is the RELATIONSHIP/CONSENT
 * path (repo owner, enterprise, or a claimed identity) — never the public mirror, which hosts no
 * profile of a stranger (STRATEGY §3). Bounded to the top-N; degrades gracefully on any failure.
 */
export async function enrichContributors(contributors: Contributor[], opts: EnrichOptions = {}): Promise<Contributor[]> {
  const withHandles = await resolveHandles(contributors, opts);
  const token = opts.token;
  if (!token) return withHandles;
  const targets = withHandles.filter((c) => c.kind === "human" && c.handle).slice(0, opts.top ?? 5);
  const profiles = await Promise.all(targets.map((c) => enrichIdentity(c.handle!, { token, timeoutMs: opts.timeoutMs })));
  const byC = new Map<Contributor, IdentityProfile>();
  targets.forEach((c, i) => {
    const p = profiles[i];
    if (p) byC.set(c, p);
  });
  return byC.size ? withHandles.map((c) => (byC.has(c) ? { ...c, profile: byC.get(c) } : c)) : withHandles;
}
