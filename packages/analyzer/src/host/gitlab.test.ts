import { describe, it, expect } from "vitest";
import { gitlabAdapter } from "./gitlab";
import { githubAdapter } from "./github"; // import so this file's isolated registry has each
import { getHostAdapter, listHostAdapters, detectCiRange } from "./registry";

describe("gitlabAdapter — implements only what GitLab supports", () => {
  it("has no zero-network handle scheme → email key falls back", () => {
    expect(gitlabAdapter.handleFromEmail("jane@example.com")).toBeNull();
    expect(gitlabAdapter.handleFromEmail(undefined)).toBeNull();
  });
  it("keys by handle when one is known", () => {
    expect(gitlabAdapter.handleKey("Jane")).toBe("gl:jane");
  });
  it("omits the optional profile + enrichment capabilities it doesn't provide", () => {
    expect(gitlabAdapter.profileUrl).toBeUndefined();
    expect(gitlabAdapter.resolveHandleViaApi).toBeUndefined();
    expect(gitlabAdapter.fetchProfile).toBeUndefined();
  });
});

describe("gitlabAdapter.ciRange — the MR range from GitLab CI env", () => {
  it("builds base..head on a merge_request pipeline", () => {
    expect(
      gitlabAdapter.ciRange!({
        CI_PIPELINE_SOURCE: "merge_request_event",
        CI_MERGE_REQUEST_DIFF_BASE_SHA: "base111",
        CI_COMMIT_SHA: "head222",
      }),
    ).toBe("base111..head222");
  });
  it("returns null off a merge_request pipeline, or without the base/head (\"not my CI\")", () => {
    expect(gitlabAdapter.ciRange!({ CI_PIPELINE_SOURCE: "push" })).toBeNull();
    expect(gitlabAdapter.ciRange!({ CI_PIPELINE_SOURCE: "merge_request_event", CI_COMMIT_SHA: "head222" })).toBeNull();
    expect(gitlabAdapter.ciRange!({})).toBeNull();
  });
});

describe("host registry — the third adapter registers through the same open door", () => {
  it("is discoverable and does not collide with GitHub's detection", () => {
    expect(getHostAdapter("gitlab")).toBe(gitlabAdapter);
    expect(listHostAdapters().map((a) => a.id)).toEqual(expect.arrayContaining(["github", "gitlab"]));
    // GitLab CI env (no GITHUB_EVENT_*) resolves to the GitLab adapter, not GitHub.
    expect(
      detectCiRange({ CI_PIPELINE_SOURCE: "merge_request_event", CI_MERGE_REQUEST_DIFF_BASE_SHA: "base111", CI_COMMIT_SHA: "head222" }),
    ).toEqual({ range: "base111..head222", host: "gitlab" });
    // and GitHub does not falsely match a GitLab env
    expect(githubAdapter.ciRange!({ CI_PIPELINE_SOURCE: "merge_request_event" })).toBeNull();
  });
});
