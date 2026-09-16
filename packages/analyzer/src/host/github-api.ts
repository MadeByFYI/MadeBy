import type { IdentityProfile } from "../analyze";
import { githubAdapter } from "./github";
import type { HostApiOptions, RepoRef } from "./types";

// GitHub's NETWORK surface — split out of `./github`. Importing this module
// AUGMENTS the registered GitHub adapter with its API methods (`resolveHandleViaApi`, `fetchProfile`).
// Only network-capable surfaces import it (the web app's analyze path); the `madeby` CLI never does,
// so `fetch` and `api.github.com` are simply ABSENT from the CLI bundle — the offline guarantee holds
// by construction, not by promise. Without this import the adapter's network methods are undefined
// and every caller (`enrich.ts`) gracefully no-ops.

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

githubAdapter.resolveHandleViaApi = async function (repo: RepoRef, email: string, opts: HostApiOptions): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/commits?author=${encodeURIComponent(email)}&per_page=1`;
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
};

githubAdapter.fetchProfile = async function (handle: string, opts: HostApiOptions): Promise<IdentityProfile | null> {
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
};
