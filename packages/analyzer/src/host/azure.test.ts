import { describe, it, expect } from "vitest";
import { azureAdapter } from "./azure";
import { githubAdapter } from "./github"; // import both so this file's isolated registry has each
import { getHostAdapter, listHostAdapters, detectCiRange } from "./registry";

describe("azureAdapter — implements only what Azure DevOps supports", () => {
  it("has no zero-network handle scheme (no noreply encoding) → email key falls back", () => {
    expect(azureAdapter.handleFromEmail("jane@contoso.com")).toBeNull();
    expect(azureAdapter.handleFromEmail(undefined)).toBeNull();
  });
  it("keys by handle when one is known", () => {
    expect(azureAdapter.handleKey("Jane")).toBe("az:jane");
  });
  it("omits the optional public-profile + enrichment capabilities Azure doesn't have", () => {
    expect(azureAdapter.profileUrl).toBeUndefined();
    expect(azureAdapter.resolveHandleViaApi).toBeUndefined();
    expect(azureAdapter.fetchProfile).toBeUndefined();
  });
});

describe("azureAdapter.ciRange — the PR range from Azure Pipelines env", () => {
  it("builds origin/<target>..<sourceCommit> on a PR build", () => {
    expect(
      azureAdapter.ciRange!({
        BUILD_REASON: "PullRequest",
        SYSTEM_PULLREQUEST_TARGETBRANCH: "refs/heads/main",
        SYSTEM_PULLREQUEST_SOURCECOMMITID: "abc123",
      }),
    ).toBe("origin/main..abc123");
  });
  it("falls back to HEAD when the source commit id is absent", () => {
    expect(
      azureAdapter.ciRange!({ BUILD_REASON: "PullRequest", SYSTEM_PULLREQUEST_TARGETBRANCH: "refs/heads/release/2.0" }),
    ).toBe("origin/release/2.0..HEAD");
  });
  it("returns null off a PR build, or without a target branch (\"not my CI\")", () => {
    expect(azureAdapter.ciRange!({ BUILD_REASON: "IndividualCI" })).toBeNull();
    expect(azureAdapter.ciRange!({ BUILD_REASON: "PullRequest" })).toBeNull();
    expect(azureAdapter.ciRange!({})).toBeNull();
  });
});

describe("host registry — the second adapter registers through the same open door", () => {
  it("is discoverable and does not collide with GitHub's detection", () => {
    expect(getHostAdapter("azure-devops")).toBe(azureAdapter);
    expect(getHostAdapter("github")).toBe(githubAdapter);
    expect(listHostAdapters().map((a) => a.id)).toEqual(expect.arrayContaining(["github", "azure-devops"]));
    // Azure CI env (no GITHUB_EVENT_*) resolves to the Azure adapter, not GitHub.
    expect(
      detectCiRange({ BUILD_REASON: "PullRequest", SYSTEM_PULLREQUEST_TARGETBRANCH: "refs/heads/main", SYSTEM_PULLREQUEST_SOURCECOMMITID: "abc123" }),
    ).toEqual({ range: "origin/main..abc123", host: "azure-devops" });
  });
});
