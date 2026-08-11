import { registerHostAdapter } from "./registry";
import type { HostAdapter } from "./types";

// GitLab — the THIRD adapter, further proving the seam scales across forges (ARCHITECTURE §12) with
// zero CLI or core changes. Like Azure DevOps, GitLab has no public noreply-handle encoding in commit
// emails, so this adapter implements what the host actually supports — the git-native gate (ciRange)
// and a handleKey — and omits handle/profile resolution. The disclosure gate works regardless;
// identity simply degrades to the email key.

export const gitlabAdapter: HostAdapter = {
  id: "gitlab",
  name: "GitLab",

  // GitLab commit emails carry no reliable public handle encoding (unlike GitHub's noreply). We never
  // guess an identity from an email, so there is nothing to resolve zero-network here.
  handleFromEmail(): string | null {
    return null;
  },

  handleKey(handle: string): string {
    return `gl:${handle.toLowerCase()}`;
  },

  // GitLab CI sets these predefined variables on a merge-request pipeline. CI_MERGE_REQUEST_DIFF_BASE_SHA
  // is the merge-base of the MR; CI_COMMIT_SHA is the head — so base..head is the MR's own commits.
  // (Needs the MR pipeline / a deep-enough fetch for those SHAs.) Any absence → null (recent history).
  ciRange(env: Record<string, string | undefined>): string | null {
    if (env.CI_PIPELINE_SOURCE !== "merge_request_event") return null;
    const base = env.CI_MERGE_REQUEST_DIFF_BASE_SHA;
    const head = env.CI_COMMIT_SHA;
    if (base && head) return `${base}..${head}`;
    return null;
  },
};

// Register through the same open door as the reference adapter — no privilege, no special-casing.
registerHostAdapter(gitlabAdapter);
