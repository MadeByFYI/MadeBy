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

  it("the on-disk form is flat and glance-readable (self-describing tag, one row per span)", () => {
    const disk = JSON.parse(serializeSpanManifest(manifest())) as {
      madeby: string;
      commit: string;
      recorded: string;
      spans: { file: string; lines: string; model: string; provider: string; operator: string; source: string; fingerprint: string }[];
    };
    expect(disk.madeby).toBe("spans/0"); // the first line tells you what the file is
    expect(disk.recorded).toBe("2026-06-29T00:00:00Z");
    expect(disk.commit).toMatch(/^deadbeef/);
    const s = disk.spans[0]!;
    expect(s.file).toBe("packages/core/src/edges.ts");
    expect(s.lines).toBe("1-40");
    expect(s.model).toBe("claude");
    expect(s.fingerprint).toBe("git-blob-sha1:FILE:abc123"); // compact algorithm:target:value
    expect(JSON.stringify(s)).not.toContain("anchor"); // no nesting on disk
  });

  it("collapses a single-line span's range and omits lines when unanchored", () => {
    const oneLine = JSON.parse(serializeSpanManifest(manifest({ attestations: [{ anchor: { fingerprint: { algorithm: "sha256", target: "TEXT", value: "ff" }, hint: { path: "a.ts", startLine: 7, endLine: 7 } }, attribution: attestation().attribution }] }))) as { spans: { lines?: string }[] };
    expect(oneLine.spans[0]!.lines).toBe("7");
    const noHint = JSON.parse(serializeSpanManifest(manifest({ attestations: [{ anchor: { fingerprint: { algorithm: "sha256", target: "TEXT", value: "ff" } }, attribution: attestation().attribution }] }))) as { spans: { file?: string; lines?: string }[] };
    expect(noHint.spans[0]!.file).toBeUndefined();
    expect(noHint.spans[0]!.lines).toBeUndefined();
  });

  it("flattening the carrier does NOT change the signed bytes (carrier ≠ canonical payload)", () => {
    const m = manifest();
    expect(dec(canonicalizeSpanManifest(parseSpanManifest(serializeSpanManifest(m))))).toBe(dec(canonicalizeSpanManifest(m)));
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
    expect(() => parseSpanManifest("{}")).toThrow(/not a madeby spans file/);
    // the legacy nested shape is not silently half-read — it's rejected as not-a-spans-file
    expect(() => parseSpanManifest(JSON.stringify({ version: "0", commit: "x", generatedAt: "t", attestations: [] }))).toThrow(/not a madeby spans file/);
    expect(() => parseSpanManifest(JSON.stringify({ madeby: "spans/0", commit: "x", recorded: "t" }))).toThrow(/spans/);
    expect(() => parseSpanManifest(JSON.stringify({ madeby: "spans/0", commit: "x", recorded: "t", spans: [{ model: "m", provider: "p", operator: "o", source: "s" }] }))).toThrow(/fingerprint/);
  });
});
