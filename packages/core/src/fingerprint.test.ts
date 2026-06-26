import { describe, it, expect } from "vitest";
import { sha256Fingerprint, gitBlobFingerprint, exactFingerprints } from "./fingerprint";

const enc = (s: string) => new TextEncoder().encode(s);

describe("exact fingerprints", () => {
  it("git-blob-sha1 is byte-identical to `git hash-object`", async () => {
    // `printf 'hello\\n' | git hash-object --stdin` → ce013625030ba8dba906f756967f9e9ca394464a
    const fp = await gitBlobFingerprint(enc("hello\n"));
    expect(fp.algorithm).toBe("git-blob-sha1");
    expect(fp.value).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });

  it("sha256 matches the known digest", async () => {
    // SHA-256("abc")
    const fp = await sha256Fingerprint(enc("abc"));
    expect(fp.value).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("content gets multiple exact keys (findable by whatever hash an asker holds)", async () => {
    const fps = await exactFingerprints(enc("hello\n"));
    expect(fps.map((f) => f.algorithm).sort()).toEqual(["git-blob-sha1", "sha256"]);
    expect(fps.every((f) => f.value.length > 0)).toBe(true);
  });
});
