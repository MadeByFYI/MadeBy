import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSpanManifestsFromDir, summarizeSpanEvidence } from "./provenance";

function manifest(commit: string, files: { path: string; provider?: string; model?: string; source?: string }[]) {
  return JSON.stringify({
    version: "0",
    commit,
    generatedAt: "2026-06-30T00:00:00Z",
    attestations: files.map((f) => ({
      anchor: { fingerprint: { algorithm: "git-blob-sha1", target: "FILE", value: "abc" }, hint: { path: f.path } },
      attribution: { provider: f.provider ?? "anthropic", model: f.model ?? "claude", operatorId: "mac@madeby.fyi", source: f.source ?? "claude-code-session-log" },
    })),
  });
}

describe("span-evidence reading + summary (the witnessed recall signal)", () => {
  it("reads .madeby/spans and summarizes files / providers / sources", () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-prov-"));
    try {
      mkdirSync(join(dir, ".madeby", "spans"), { recursive: true });
      writeFileSync(join(dir, ".madeby", "spans", "a.json"), manifest("aaa", [{ path: "src/x.ts" }, { path: "src/y.ts" }]));
      writeFileSync(join(dir, ".madeby", "spans", "b.json"), manifest("bbb", [{ path: "src/x.ts", provider: "github-copilot", model: "copilot" }]));
      writeFileSync(join(dir, ".madeby", "spans", "junk.json"), "{ not valid"); // skipped, not trusted

      const ev = summarizeSpanEvidence(readSpanManifestsFromDir(dir));
      expect(ev.attestations).toBe(3);
      expect(ev.files).toBe(2); // src/x.ts (twice) + src/y.ts → 2 distinct
      expect(ev.providers.map((p) => p.provider).sort()).toEqual(["anthropic", "github-copilot"]);
      expect(ev.providers[0]).toEqual({ provider: "anthropic", model: "claude", attestations: 2 }); // most by count
      expect(ev.sources).toEqual(["claude-code-session-log"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty evidence for a repo with no .madeby (the common case)", () => {
    const dir = mkdtempSync(join(tmpdir(), "madeby-prov-empty-"));
    try {
      const ev = summarizeSpanEvidence(readSpanManifestsFromDir(dir));
      expect(ev.attestations).toBe(0);
      expect(ev.files).toBe(0);
      expect(ev.providers).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
