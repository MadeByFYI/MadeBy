import { describe, it, expect, afterEach } from "vitest";
import { enrichContributors } from "./enrich";
import type { Contributor } from "./analyze";

const c = (over: Partial<Contributor>): Contributor => ({ kind: "human", name: "x", commits: 1, ...over });

const origFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = origFetch;
});

describe("enrichContributors — bounded, graceful GitHub-API overlay", () => {
  it("returns contributors unchanged (same ref) when no token is given", async () => {
    const cs = [c({ handle: "jane" })];
    expect(await enrichContributors(cs)).toBe(cs);
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

    const cs = [c({ name: "Jane", handle: "jane", commits: 5 }), c({ name: "Bob", commits: 2 })];
    const out = await enrichContributors(cs, { token: "x" });
    expect(out[0]!.profile?.name).toBe("Jane Dev");
    expect(out[0]!.profile?.reach).toBe("12k followers · cool (21k★)");
    expect(out[1]!.profile).toBeUndefined(); // no handle → not enriched
  });

  it("degrades to un-enriched on API failure (never throws)", async () => {
    globalThis.fetch = (async () => {
      throw new Error("rate limited");
    }) as typeof fetch;
    const cs = [c({ handle: "jane" })];
    const out = await enrichContributors(cs, { token: "x" });
    expect(out[0]!.profile).toBeUndefined();
  });
});
