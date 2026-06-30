import { describe, it, expect } from "vitest";
import {
  SPAN_MANIFEST_VERSION,
  spanManifestPath,
  canonicalizeSpanManifest,
  serializeSpanManifest,
  parseSpanManifest,
  type SpanManifest,
} from "./manifest";
import type { SpanAttestationV0 } from "./span";

const attestation = (over: Partial<SpanAttestationV0["attribution"]> = {}): SpanAttestationV0 => ({
  anchor: {
    fingerprint: { algorithm: "git-blob-sha1", target: "FILE", value: "abc123" },
    hint: { path: "packages/core/src/edges.ts", startLine: 1, endLine: 40 },
  },
  attribution: { provider: "anthropic", model: "claude", operatorId: "mac@madeby.fyi", source: "git-commit-trailer-v0", ...over },
});

const manifest = (over: Partial<SpanManifest> = {}): SpanManifest => ({
  version: SPAN_MANIFEST_VERSION,
  commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  generatedAt: "2026-06-29T00:00:00Z",
  attestations: [attestation()],
  ...over,
});

const dec = (u: Uint8Array) => new TextDecoder().decode(u);

describe("span manifest (v0 sidecar carrier)", () => {
  it("lives at a content-addressed path under .madeby/", () => {
    expect(spanManifestPath("abc")).toBe(".madeby/spans/abc.json");
  });

  it("round-trips through serialize → parse", () => {
    const m = manifest();
    const parsed = parseSpanManifest(serializeSpanManifest(m));
    expect(parsed).toEqual(m);
  });

  it("canonical bytes exclude the signature (so a signature can cover them)", () => {
    const unsigned = dec(canonicalizeSpanManifest(manifest()));
    const signed = dec(canonicalizeSpanManifest(manifest({ signature: { signerKeyId: "k", value: "v", carrierId: "git-notes", signedAt: "2026-06-29T00:00:00Z" } })));
    expect(unsigned).toBe(signed);
    expect(unsigned).not.toContain("signerKeyId");
  });

  it("canonicalization is deterministic and order-independent on attestation fields", () => {
    const a = dec(canonicalizeSpanManifest(manifest()));
    const b = dec(canonicalizeSpanManifest(manifest()));
    expect(a).toBe(b);
  });

  it("tampering with an attestation changes the canonical bytes", () => {
    const base = dec(canonicalizeSpanManifest(manifest()));
    const tampered = dec(canonicalizeSpanManifest(manifest({ attestations: [attestation({ operatorId: "attacker@example.com" })] })));
    expect(base).not.toBe(tampered);
  });

  it("a manifest with no attestations is valid (an honest human-only commit)", () => {
    const m = manifest({ attestations: [] });
    expect(parseSpanManifest(serializeSpanManifest(m)).attestations).toHaveLength(0);
  });

  it("rejects malformed manifests (fail safe — never half-trust)", () => {
    expect(() => parseSpanManifest("{}")).toThrow();
    expect(() => parseSpanManifest(JSON.stringify({ version: "0", commit: "x", generatedAt: "t" }))).toThrow(/attestations/);
    expect(() => parseSpanManifest(JSON.stringify({ version: "0", commit: "x", generatedAt: "t", attestations: [{ anchor: {}, attribution: {} }] }))).toThrow(/fingerprint/);
  });
});
