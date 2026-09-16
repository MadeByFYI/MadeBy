import { describe, it, expect } from "vitest";
import { assertSubjectIsReference } from "./guards";
import { isExactFingerprint, isNativeFingerprint } from "./fingerprint";
import type { Fingerprint } from "./fingerprint";

const fp = (algorithm: string): Fingerprint => ({ algorithm, target: "FILE", value: "v" });

describe("invariant #1 — subject is a native reference, never a re-hash", () => {
  it("accepts native content fingerprints", () => {
    expect(() => assertSubjectIsReference(fp("git-blob-sha1"))).not.toThrow();
    expect(() => assertSubjectIsReference(fp("sha256"))).not.toThrow();
    expect(() => assertSubjectIsReference(fp("structural-v1"))).not.toThrow();
  });
  it("rejects MadeBy-internal envelope hashes", () => {
    expect(() => assertSubjectIsReference(fp("madeby-claim-sha256"))).toThrow();
    expect(() => assertSubjectIsReference(fp("envelope-sha256"))).toThrow();
    expect(() => assertSubjectIsReference(fp("claim-hash"))).toThrow();
  });
});

describe("fingerprint classification", () => {
  it("exact algorithms support byte binding", () => {
    expect(isExactFingerprint(fp("sha256"))).toBe(true);
    expect(isExactFingerprint(fp("git-blob-sha1"))).toBe(true);
  });
  it("fuzzy/structural algorithms do not", () => {
    expect(isExactFingerprint(fp("structural-v1"))).toBe(false);
  });
  it("native check rejects reserved namespaces and empty values", () => {
    expect(isNativeFingerprint(fp("sha256"))).toBe(true);
    expect(isNativeFingerprint(fp("madeby-x"))).toBe(false);
    expect(isNativeFingerprint({ algorithm: "", target: "FILE", value: "v" })).toBe(false);
    expect(isNativeFingerprint({ algorithm: "sha256", target: "FILE", value: "" })).toBe(false);
  });
});
