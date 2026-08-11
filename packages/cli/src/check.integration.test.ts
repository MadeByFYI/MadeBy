// End-to-end proof that the disclosure gate actually FIRES — the README calls the Action "ready";
// this makes it "tested". We spawn the *built* bin (`dist/madeby.mjs`, produced by the `pretest`
// build) exactly as `npx madeby check` would, against throwaway git repos we construct with a known
// mix of disclosed / undisclosed commits, and assert the exit code + output for each policy mode.
//
// Exit-code contract (commands/check.ts): 0 = pass (advisory/off always pass; required passes when
// every in-range commit discloses), 1 = required gate fails on an undisclosed commit, 2 = not a git
// repo. The gate is the product's whole promise to a maintainer — if it can't fail a required PR,
// nothing else matters.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "madeby.mjs");

const dirs: string[] = [];
function tmpRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "madeby-cli-"));
  dirs.push(dir);
  return dir;
}

// git, pinned to a deterministic identity with signing/hooks disabled so CI can't perturb commits.
function git(dir: string, ...args: string[]): string {
  return execFileSync(
    "git",
    ["-C", dir, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
    { encoding: "utf8" },
  ).trim();
}

function commit(dir: string, file: string, body: string, message: string): string {
  writeFileSync(join(dir, file), body);
  git(dir, "add", file);
  git(dir, "commit", "--no-verify", "-m", message);
  return git(dir, "rev-parse", "HEAD");
}

function writePolicy(dir: string, mode: string): void {
  execFileSync("mkdir", ["-p", join(dir, ".madeby")]);
  writeFileSync(join(dir, ".madeby", "policy.json"), JSON.stringify({ version: 0, mode }));
}

// Run `madeby check [range]` on the built bin exactly as a user/CI would. spawnSync doesn't throw
// on non-zero exit, so we read the status directly. We neutralize any ambient host-CI env (our own
// CI sets GITHUB_EVENT_*) so the no-range cases test "recent history" deterministically; the
// auto-detect path has its own test that sets the env explicitly.
function run(dir: string, ...args: string[]): { code: number; out: string } {
  const env = { ...process.env };
  delete env.GITHUB_EVENT_NAME;
  delete env.GITHUB_EVENT_PATH;
  const r = spawnSync(process.execPath, [BIN, "check", ...args], { cwd: dir, encoding: "utf8", env });
  return { code: r.status ?? -1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

// A repo with three commits: root undisclosed, then one AI-trailer, then one DCO sign-off.
// Returns the root sha so a range can exclude the undisclosed root (an all-disclosed slice).
let repo = "";
let rootSha = "";
let headSha = "";
beforeAll(() => {
  repo = tmpRepo();
  git(repo, "init", "-q", "-b", "main");
  rootSha = commit(repo, "a.txt", "one\n", "chore: initial commit"); // undisclosed
  commit(repo, "b.txt", "two\n", "feat: add b\n\nCo-Authored-By: Claude <noreply@anthropic.com>"); // ai-trailer
  headSha = commit(repo, "c.txt", "three\n", "fix: tweak c\n\nSigned-off-by: Dev <dev@example.com>"); // dco-signoff
});

afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("madeby check — the disclosure gate fires per policy", () => {
  it("advisory: reports coverage over full history but never fails (undisclosed present → still exit 0)", () => {
    writePolicy(repo, "advisory");
    const { code, out } = run(repo);
    expect(code).toBe(0);
    expect(out).toMatch(/advisory/i);
    expect(out).toContain("chore: initial commit"); // the undisclosed one is surfaced, not gated
  });

  it("required: FAILS on an undisclosed commit (exit 1) and names it", () => {
    writePolicy(repo, "required");
    const { code, out } = run(repo);
    expect(code).toBe(1); // the gate actually fires — the core promise
    expect(out).toContain("chore: initial commit");
  });

  it("required: PASSES (exit 0) over a range where every commit discloses", () => {
    writePolicy(repo, "required");
    const { code } = run(repo, `${rootSha}..HEAD`); // excludes the undisclosed root → b + c, both disclosed
    expect(code).toBe(0);
  });

  it("off: never gates, even with undisclosed commits (exit 0)", () => {
    writePolicy(repo, "off");
    const { code } = run(repo);
    expect(code).toBe(0);
  });

  it("auto-scopes to the PR range from the GitHub CI env — no range arg", () => {
    writePolicy(repo, "required");
    // Full history fails: the undisclosed root is in scope.
    expect(run(repo).code).toBe(1);
    // A pull_request event whose base is the root excludes it → scope is b + c (both disclosed) →
    // passes. That the result flips proves the range came from the adapter (the CI env), not an arg.
    const eventPath = join(tmpRepo(), "event.json");
    writeFileSync(eventPath, JSON.stringify({ pull_request: { base: { sha: rootSha }, head: { sha: headSha } } }));
    const r = spawnSync(process.execPath, [BIN, "check"], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: eventPath },
    });
    expect(r.status).toBe(0);
    expect(r.stdout ?? "").toMatch(/auto-scoped to the github/i);
  });

  it("fails safe: a malformed policy degrades to off, never blocks (exit 0)", () => {
    writeFileSync(join(repo, ".madeby", "policy.json"), "{ not valid json");
    const { code } = run(repo);
    expect(code).toBe(0);
  });

  it("exits 2 when run outside a git repository (no false pass, no false fail)", () => {
    const { code } = run(tmpRepo()); // fresh dir, never `git init`ed
    expect(code).toBe(2);
  });
});
