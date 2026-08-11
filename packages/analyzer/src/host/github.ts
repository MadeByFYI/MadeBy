import type { IdentityProfile } from "../analyze";
import { registerHostAdapter } from "./registry";
import type { HostAdapter, HostApiOptions, RepoRef } from "./types";

// GitHub — the REFERENCE host adapter (ARCHITECTURE §12). Everything GitHub-specific that used to be
// inline in identity.ts / enrich.ts now lives here behind the HostAdapter contract, so the same seam
// carries Azure DevOps / GitLab / … as sibling adapters. Nothing here is privileged over a
// third-party adapter — it registers through the same registry.

// GitHub's noreply email encodes the username: "<id>+<username>@users.noreply.github.com" (or the
// older "<username>@users.noreply.github.com"). So the @handle is derivable with ZERO network.
const NOREPLY = /^(?:(\d+)\+)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))@users\.noreply\.github\.com$/i;

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

export const githubAdapter: HostAdapter = {
  id: "github",
  name: "GitHub",

  handleFromEmail(email?: string): string | null {
    const m = (email ?? "").trim().match(NOREPLY);
    return m ? m[2]!.toLowerCase() : null;
  },

  handleKey(handle: string): string {
    return `gh:${handle.toLowerCase()}`;
  },

  profileUrl(handle: string): string {
    return `https://github.com/${handle}`;
  },

  async resolveHandleViaApi(repo: RepoRef, email: string, opts: HostApiOptions): Promise<string | null> {
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
  },

  async fetchProfile(handle: string, opts: HostApiOptions): Promise<IdentityProfile | null> {
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
  },
};

// Register through the open door — the reference adapter is not privileged over a third party's.
registerHostAdapter(githubAdapter);
