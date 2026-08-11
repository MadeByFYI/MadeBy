import { describe, it, expect, afterEach } from "vitest";
import { enrichContributors, resolveHandles, enrichIdentity } from "./enrich";
import type { Contributor } from "./analyze";

const c = (over: Partial<Contributor>): Contributor => ({ kind: "human", name: "x", commits: 1, ...over });

const origFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = origFetch;
});

describe("resolveHandles — the PUBLIC path: pointer (handle) only, never a hosted profile", () => {
  it("resolves a personal-email committer's handle via the commits API, sets NO profile", async () => {
    globalThis.fetch = (async () => ({ ok: true, json: async () => [{ author: { login: "janedev" } }] }) as unknown as Response) as typeof fetch;
    const out = await resolveHandles([c({ name: "Jane", detail: "jane@work.com", commits: 5 })], { token: "x", repo: { owner: "o", name: "r" } });
    expect(out[0]!.handle).toBe("janedev");
    expect(out[0]!.profile).toBeUndefined(); // link-out only, no hosted profile of a stranger
  });
  it("merges git-identities that share a handle (no token needed for noreply-derived handles)", async () => {
    const out = await resolveHandles([
      c({ name: "Jane", handle: "jane", commits: 8 }),
      c({ name: "jane", handle: "jane", commits: 5 }), // same person, different email/name
      c({ kind: "bot", name: "dependabot[bot]", commits: 3 }),
    ]);
    const jane = out.find((x) => x.handle === "jane");
    expect(jane?.commits).toBe(13); // merged, not split
    expect(jane?.name).toBe("Jane"); // top-commit name kept
    expect(out.filter((x) => x.kind === "human")).toHaveLength(1);
  });
});

describe("enrichIdentity — cached", () => {
  it("does not re-fetch a repeated handle within the TTL", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({ data: { user: { name: "Z", company: null, followers: { totalCount: 1000 }, repositories: { nodes: [] } } } }),
      } as unknown as Response;
    }) as typeof fetch;
    await enrichIdentity("cache-probe-unique-handle", { token: "x" });
    await enrichIdentity("cache-probe-unique-handle", { token: "x" });
    expect(calls).toBe(1);
  });
});

describe("enrichContributors — bounded, graceful GitHub-API overlay", () => {
  it("attaches no profile when no token is given", async () => {
    const out = await enrichContributors([c({ handle: "jane", commits: 3 })]);
    expect(out[0]!.profile).toBeUndefined();
    expect(out[0]!.handle).toBe("jane");
  });

  it("overlays name + reach onto handle'd contributors, leaves others alone", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          data: {
            user: {
              name: "Jane Dev",
              company: null,
              followers: { totalCount: 12000 },
              repositories: { nodes: [{ name: "cool", stargazerCount: 21000 }] },
            },
          },
        }),
      }) as unknown as Response) as typeof fetch;

    const cs = [c({ name: "Jane", handle: "jane-overlay", commits: 5 }), c({ name: "Bob", commits: 2 })];
    const out = await enrichContributors(cs, { token: "x" });
    expect(out[0]!.profile?.name).toBe("Jane Dev");
    expect(out[0]!.profile?.reach).toBe("12k followers · cool (21k★)");
    expect(out[1]!.profile).toBeUndefined(); // no handle → not enriched
  });

  it("degrades to un-enriched on API failure (never throws)", async () => {
    globalThis.fetch = (async () => {
      throw new Error("rate limited");
    }) as typeof fetch;
    const cs = [c({ handle: "jane-fail-unique" })];
    const out = await enrichContributors(cs, { token: "x" });
    expect(out[0]!.profile).toBeUndefined();
  });
});
