import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { readDisclosures, evaluateRepoDisclosure } from "./read-disclosures";

const dirs: string[] = [];
function git(dir: string, ...args: string[]): string {
  return execFileSync("git", ["-C", dir, "-c", "user.name=T", "-c", "user.email=t@e.com", "-c", "commit.gpgsign=false", ...args], { encoding: "utf8" }).trim();
}
function commit(dir: string, file: string, body: string, msg: string): void {
  writeFileSync(join(dir, file), body);
  git(dir, "add", file);
  git(dir, "commit", "--no-verify", "-m", msg);
}

let repo = "";
beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "madeby-read-disclosures-"));
  dirs.push(repo);
  git(repo, "init", "-q", "-b", "main");
  commit(repo, "a.txt", "1\n", "chore: base"); // undisclosed
  commit(repo, "b.txt", "2\n", "feat: b\n\nCo-Authored-By: Claude <noreply@anthropic.com>"); // ai-trailer
  commit(repo, "c.txt", "3\n", "fix: c\n\nSigned-off-by: Dev <d@e.com>"); // dco
});
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("readDisclosures — the raw library primitive (reads what commits declare, no policy)", () => {
  it("reads per-commit disclosure kinds", () => {
    const rows = readDisclosures(repo);
    expect(rows.find((r) => r.subject === "chore: base")!.disclosures).toEqual([]);
    expect(rows.find((r) => r.subject.startsWith("feat: b"))!.disclosures).toContain("ai-trailer");
    expect(rows.find((r) => r.subject.startsWith("fix: c"))!.disclosures).toContain("dco-signoff");
  });
});

describe("evaluateRepoDisclosure — the gate as data (fail-safe)", () => {
  it("no policy file → optional → defaults to advisory (reports, never blocks)", () => {
    const r = evaluateRepoDisclosure(repo);
    expect(r.mode).toBe("advisory");
    expect(r.pass).toBe(true);
  });
  it("required policy → fails on the undisclosed base and names it", () => {
    mkdirSync(join(repo, ".madeby"), { recursive: true });
    writeFileSync(join(repo, ".madeby", "policy.json"), JSON.stringify({ version: 0, mode: "required" }));
    const r = evaluateRepoDisclosure(repo);
    expect(r.mode).toBe("required");
    expect(r.pass).toBe(false);
    expect(r.undisclosed.some((u) => u.subject === "chore: base")).toBe(true);
  });
  it("malformed policy → warning + degrades to advisory (never blocks)", () => {
    writeFileSync(join(repo, ".madeby", "policy.json"), "{ bad json");
    const r = evaluateRepoDisclosure(repo);
    expect(r.warning).toBeDefined();
    expect(r.mode).toBe("advisory");
    expect(r.pass).toBe(true);
  });
});
