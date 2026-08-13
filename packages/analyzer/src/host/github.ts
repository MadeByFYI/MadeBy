import { readFileSync } from "node:fs";
import { registerHostAdapter } from "./registry";
import type { HostAdapter } from "./types";

// GitHub — the REFERENCE host adapter (ARCHITECTURE §12). Everything GitHub-specific that used to be
// inline in identity.ts / enrich.ts now lives here behind the HostAdapter contract, so the same seam
// carries Azure DevOps / GitLab / … as sibling adapters. Nothing here is privileged over a
// third-party adapter — it registers through the same registry.
//
// This module holds only the OFFLINE surface (handle derivation + CI-range detection). The API /
// network methods (`resolveHandleViaApi`, `fetchProfile`) live in `./github-api`, imported only by
// network-capable surfaces (the web app) — so the `madeby` CLI bundle carries no `fetch` and no
// `api.github.com` (PRE-INCORPORATION §6a: "Nothing leaves your machine," true by construction).

// GitHub's noreply email encodes the username: "<id>+<username>@users.noreply.github.com" (or the
// older "<username>@users.noreply.github.com"). So the @handle is derivable with ZERO network.
const NOREPLY = /^(?:(\d+)\+)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))@users\.noreply\.github\.com$/i;

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

  // On a `pull_request` event GitHub sets GITHUB_EVENT_NAME + GITHUB_EVENT_PATH (a JSON payload with
  // the PR's base/head SHAs). Reading base..head here replaces the bash range computation the Action
  // used to carry — the range logic now lives once, in the adapter. Needs the PR history present
  // (the quickstart's `fetch-depth: 0`). Any absence/parse failure → null (fall back to recent
  // history); never throws.
  ciRange(env: Record<string, string | undefined>): string | null {
    const event = env.GITHUB_EVENT_NAME;
    if (event !== "pull_request" && event !== "pull_request_target") return null;
    const path = env.GITHUB_EVENT_PATH;
    if (!path) return null;
    try {
      const payload = JSON.parse(readFileSync(path, "utf8")) as {
        pull_request?: { base?: { sha?: string }; head?: { sha?: string } };
      };
      const base = payload.pull_request?.base?.sha;
      const head = payload.pull_request?.head?.sha;
      if (base && head) return `${base}..${head}`;
    } catch {
      // unreadable / malformed event payload → no range; the gate degrades to recent history
    }
    return null;
  },
};

// Register through the open door — the reference adapter is not privileged over a third party's.
registerHostAdapter(githubAdapter);
