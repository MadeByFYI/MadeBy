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

/** Fetch a GitHub profile + reach for one handle. Returns null on any failure (graceful). */
export async function enrichIdentity(handle: string, opts: { token: string; timeoutMs?: number }): Promise<IdentityProfile | null> {
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
async function resolveHandleViaCommits(
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
  if (!token || !repo) return contributors; // noreply handles are already set; the rest needs token+repo
  const targets = contributors.filter((c) => c.kind === "human" && !c.handle && c.detail).slice(0, opts.top ?? 5);
  const resolved = await Promise.all(
    targets.map(async (c) => {
      const handle = await resolveHandleViaCommits(repo.owner, repo.name, c.detail!, { token, timeoutMs: opts.timeoutMs });
      return handle ? ([c, handle] as const) : null;
    }),
  );
  const byC = new Map<Contributor, string>();
  for (const r of resolved) if (r) byC.set(r[0], r[1]);
  return byC.size ? contributors.map((c) => (byC.has(c) ? { ...c, handle: byC.get(c)! } : c)) : contributors;
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
