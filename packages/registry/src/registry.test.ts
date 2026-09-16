import { describe, it, expect } from "vitest";
import { InMemoryRegistry, resolveByFingerprint, demoRegistry } from "./index";
import type { Subject, Claim } from "@madeby/core";

const fp = { algorithm: "sha256", target: "FILE", value: "abc123" };
const subject: Subject = { id: "s1", fingerprints: [fp] };
const claim: Claim = {
  id: "c1",
  subject: fp,
  attribution: { identityId: "alice", role: "creator" },
  assertedTier: "asserted",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("InMemoryRegistry + resolveByFingerprint", () => {
  it("resolves a subject found by one of its fingerprints", () => {
    const reg = new InMemoryRegistry();
    reg.add(subject, [claim]);
    const r = resolveByFingerprint(reg, "sha256", "abc123");
    expect(r).not.toBeNull();
    expect(r!.subject.value).toBe("abc123");
    expect(r!.best?.claim.attribution.identityId).toBe("alice");
  });

  it("returns null for an unknown fingerprint (the 'no record → analyze' state)", () => {
    const reg = new InMemoryRegistry();
    reg.add(subject, [claim]);
    expect(resolveByFingerprint(reg, "sha256", "unknown")).toBeNull();
  });

  it("v0 caps at asserted (signature verification not yet wired)", () => {
    const reg = new InMemoryRegistry();
    reg.add(subject, [{ ...claim, assertedTier: "bound" }]);
    expect(resolveByFingerprint(reg, "sha256", "abc123")!.best?.tier).toBe("asserted");
  });

  it("the demo registry resolves its example subject", () => {
    const r = resolveByFingerprint(demoRegistry(), "git-blob-sha1", "ce013625030ba8dba906f756967f9e9ca394464a");
    expect(r?.best?.claim.attribution.identityId).toBe("MacDougherty");
  });
});
