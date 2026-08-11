import { describe, it, expect, afterEach } from "vitest";
import { githubAdapter } from "./github";
import { getHostAdapter, listHostAdapters } from "./registry";

const origFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = origFetch;
});

describe("githubAdapter — pure identity ops (zero-network)", () => {
  it("derives the handle from a modern noreply email", () => {
    expect(githubAdapter.handleFromEmail("1234567+octocat@users.noreply.github.com")).toBe("octocat");
  });
  it("derives the handle from a legacy noreply email", () => {
    expect(githubAdapter.handleFromEmail("octocat@users.noreply.github.com")).toBe("octocat");
  });
  it("returns null for a personal email (no deanonymization) and for empties", () => {
    expect(githubAdapter.handleFromEmail("jane@example.com")).toBeNull();
    expect(githubAdapter.handleFromEmail("")).toBeNull();
    expect(githubAdapter.handleFromEmail(undefined)).toBeNull();
  });
  it("keys and links by handle, lowercased", () => {
    expect(githubAdapter.handleKey("OctoCat")).toBe("gh:octocat");
    expect(githubAdapter.profileUrl("octocat")).toBe("https://github.com/octocat");
  });
});

describe("host registry — the reference adapter registers through the open door", () => {
  it("is discoverable by id and appears in the list", () => {
    expect(getHostAdapter("github")).toBe(githubAdapter);
    expect(listHostAdapters().map((a) => a.id)).toContain("github");
  });
});

describe("githubAdapter — network ops degrade gracefully", () => {
  it("resolveHandleViaApi reads the commits-API login, null on failure", async () => {
    globalThis.fetch = (async () => ({ ok: true, json: async () => [{ author: { login: "janedev" } }] }) as unknown as Response) as typeof fetch;
    expect(await githubAdapter.resolveHandleViaApi!({ owner: "o", name: "r" }, "jane@work.com", { token: "x" })).toBe("janedev");
    globalThis.fetch = (async () => {
      throw new Error("down");
    }) as typeof fetch;
    expect(await githubAdapter.resolveHandleViaApi!({ owner: "o", name: "r" }, "jane@work.com", { token: "x" })).toBeNull();
  });

  it("fetchProfile builds name + reach, null on non-ok", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: { user: { name: "Jane Dev", company: null, followers: { totalCount: 12000 }, repositories: { nodes: [{ name: "cool", stargazerCount: 21000 }] } } },
        }),
      }) as unknown as Response) as typeof fetch;
    const p = await githubAdapter.fetchProfile!("jane-adapter", { token: "x" });
    expect(p?.name).toBe("Jane Dev");
    expect(p?.reach).toBe("12k followers · cool (21k★)");
    globalThis.fetch = (async () => ({ ok: false }) as unknown as Response) as typeof fetch;
    expect(await githubAdapter.fetchProfile!("jane-adapter", { token: "x" })).toBeNull();
  });
});
