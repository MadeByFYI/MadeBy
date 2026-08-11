import { registerHostAdapter } from "./registry";
import type { HostAdapter } from "./types";

// Azure DevOps — the SECOND adapter, proving the seam carries a non-GitHub forge (ARCHITECTURE §12).
// It also demonstrates that the optional capabilities are genuinely optional: Azure identities are
// AAD/org-scoped with no public noreply-handle encoding and no public per-user profile pages, so
// this adapter implements only what the host actually supports — the git-native gate (ciRange) — and
// leaves handle/profile resolution unimplemented. The disclosure gate works regardless; identity
// enrichment simply degrades to the email key. Honest by construction, not a stub.

export const azureAdapter: HostAdapter = {
  id: "azure-devops",
  name: "Azure DevOps",

  // Azure commit emails are org/AAD emails with no public handle encoding (unlike GitHub's noreply).
  // We never guess an identity from an email — so there is nothing to resolve zero-network here.
  handleFromEmail(): string | null {
    return null;
  },

  handleKey(handle: string): string {
    return `az:${handle.toLowerCase()}`;
  },

  // No profileUrl / resolveHandleViaApi / fetchProfile: Azure has no public per-user profile pages,
  // and org-private identity enrichment is out of scope for the public mirror. The interface makes
  // these optional precisely so an adapter can omit what its host doesn't offer.

  // Azure Pipelines sets these predefined variables on a PR-triggered build. The target branch is
  // given as a ref (not a SHA), so the range references origin/<target>; the pipeline template uses
  // fetchDepth: 0 so that ref + the PR history are present. Any absence → null (recent history).
  ciRange(env: Record<string, string | undefined>): string | null {
    if (env.BUILD_REASON !== "PullRequest") return null;
    const targetRef = env.SYSTEM_PULLREQUEST_TARGETBRANCH; // e.g. "refs/heads/main"
    if (!targetRef) return null;
    const target = targetRef.replace(/^refs\/heads\//, "");
    const head = env.SYSTEM_PULLREQUEST_SOURCECOMMITID || "HEAD";
    return `origin/${target}..${head}`;
  },
};

// Register through the same open door as the reference adapter — no privilege, no special-casing.
registerHostAdapter(azureAdapter);
