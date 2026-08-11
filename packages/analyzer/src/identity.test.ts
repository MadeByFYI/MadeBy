import { describe, it, expect } from "vitest";
import { resolveGitHubHandle, resolveIdentity } from "./identity";
import { analyzeCommits } from "./analyze";
import type { CommitMeta } from "@madeby/classify";

describe("resolveGitHubHandle — zero-network, only what the committer publicly linked", () => {
  it("reads the handle from a modern id+username noreply email", () => {
    expect(resolveGitHubHandle("1234567+octocat@users.noreply.github.com")).toBe("octocat");
  });
  it("reads the handle from a legacy username noreply email", () => {
    expect(resolveGitHubHandle("octocat@users.noreply.github.com")).toBe("octocat");
  });
  it("does NOT resolve a private/personal email (no deanonymizing)", () => {
    expect(resolveGitHubHandle("jane@example.com")).toBeNull();
    expect(resolveGitHubHandle("")).toBeNull();
    expect(resolveGitHubHandle(undefined)).toBeNull();
  });
});

describe("resolveIdentity — merge key + handle", () => {
  it("keys by handle when derivable, else by email, never by name alone", () => {
    expect(resolveIdentity("Jane", "9+jane@users.noreply.github.com")).toEqual({ key: "gh:jane", handle: "jane" });
    expect(resolveIdentity("Jane", "jane@work.com")).toEqual({ key: "jane@work.com" });
  });
});

describe("analyzeCommits — identity resolution merges a person across noreply variants", () => {
  it("counts one person's two noreply emails as ONE contributor (accurate concentration)", () => {
    const commits: CommitMeta[] = [
      { message: "a", authorName: "Jane Dev", authorEmail: "1+jane@users.noreply.github.com" },
      { message: "b", authorName: "Jane Dev", authorEmail: "1+jane@users.noreply.github.com" },
      { message: "c", authorName: "jane", authorEmail: "jane@users.noreply.github.com" }, // legacy noreply, same handle
      { message: "d", authorName: "Bob", authorEmail: "bob@x.com" },
    ];
    const r = analyzeCommits(commits);
    const jane = r.contributors.find((c) => c.handle === "jane");
    expect(jane).toBeTruthy();
    expect(jane!.commits).toBe(3); // merged across both noreply emails, not split
    expect(r.contributors.filter((c) => c.kind === "human")).toHaveLength(2); // Jane + Bob
  });
});
