// End-to-end proof that the disclosure gate actually FIRES — the README calls the Action "ready";
// this makes it "tested". We spawn the *built* bin (`dist/madeby.mjs`, produced by the `pretest`
// build) exactly as `npx madeby check` would, against throwaway git repos we construct with a known
// mix of disclosed / undisclosed commits, and assert the exit code + output for each policy mode.
//
// Exit-code contract (commands/check.ts): 0 = pass (advisory/off always pass; required passes when
// every in-range commit discloses), 1 = required gate fails on an undisclosed commit, 2 = not a git
// repo. The gate is the product's whole promise to a maintainer — if it can't fail a required PR,
// nothing else matters.

import { execFileSync, spawn, spawnSync } from "node:child_process";
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
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GITHUB_EVENT_NAME;
  delete env.GITHUB_EVENT_PATH;
  return env;
}
function run(dir: string, ...args: string[]): { code: number; out: string } {
  const r = spawnSync(process.execPath, [BIN, "check", ...args], { cwd: dir, encoding: "utf8", env: cleanEnv() });
  return { code: r.status ?? -1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}
function runCmd(cmd: string, dir: string, ...args: string[]): { code: number; out: string } {
  const r = spawnSync(process.execPath, [BIN, cmd, ...args], { cwd: dir, encoding: "utf8", env: cleanEnv() });
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

  it("check --json: machine-readable result, exit code still gates", () => {
    writePolicy(repo, "required");
    const { code, out } = run(repo, "--json");
    const parsed = JSON.parse(out) as { pass: boolean; mode: string; undisclosed: { subject: string }[] };
    expect(parsed.pass).toBe(false);
    expect(parsed.mode).toBe("required");
    expect(parsed.undisclosed.some((u) => u.subject === "chore: initial commit")).toBe(true);
    expect(code).toBe(1); // JSON output does not disable the gate
  });
});

describe("madeby recognize — the raw disclosure primitive (no policy)", () => {
  it("--json: reports per-commit disclosure kinds, never gates (exit 0)", () => {
    const { code, out } = runCmd("recognize", repo, "--json");
    expect(code).toBe(0); // a primitive reports; it does not gate
    const parsed = JSON.parse(out) as { commits: { subject: string; disclosed: boolean; disclosures: string[] }[] };
    const root = parsed.commits.find((c) => c.subject === "chore: initial commit")!;
    expect(root.disclosed).toBe(false);
    expect(parsed.commits.find((c) => c.subject.startsWith("feat: add b"))!.disclosures).toContain("ai-trailer");
    expect(parsed.commits.find((c) => c.subject.startsWith("fix: tweak c"))!.disclosures).toContain("dco-signoff");
  });
  it("human output lists commits and a disclosed count", () => {
    const { code, out } = runCmd("recognize", repo);
    expect(code).toBe(0);
    expect(out).toMatch(/disclose origin/);
  });
});

// Drive the stdio MCP server: write JSON-RPC requests, collect responses by id, resolve once all are
// in. Kills the (long-lived) server on completion/timeout.
function mcpCall(cwd: string, requests: Array<Record<string, unknown>>): Promise<Map<number, Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, "mcp"], { cwd, env: cleanEnv() });
    const byId = new Map<number, Record<string, unknown>>();
    const wanted = requests.filter((r) => r.id !== undefined).length;
    let buf = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`mcp timeout; got ids ${JSON.stringify([...byId.keys()])}`));
    }, 20000);
    child.stdout.on("data", (d: Buffer) => {
      buf += d.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(line) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (msg.id !== undefined) byId.set(msg.id as number, msg);
        if (byId.size >= wanted) {
          clearTimeout(timer);
          child.kill();
          resolve(byId);
        }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
  });
}

describe("madeby mcp — the agent-native MCP server (stdio JSON-RPC)", () => {
  it("initialize, tools/list, and tool calls return the primitives as agent-callable tools", async () => {
    writePolicy(repo, "required");
    const res = await mcpCall(repo, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {} } },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "recognize", arguments: {} } },
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "check", arguments: {} } },
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "list_host_adapters", arguments: {} } },
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "resolve_identity", arguments: { email: "1+octocat@users.noreply.github.com" } } },
    ]);

    // initialize
    expect((res.get(1)!.result as { serverInfo: { name: string } }).serverInfo.name).toBe("madeby");
    // tools/list
    const names = (res.get(2)!.result as { tools: { name: string }[] }).tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["recognize", "check", "list_host_adapters", "resolve_identity"]));
    // recognize tool → the AI-trailer commit is surfaced
    const rec = JSON.parse((res.get(3)!.result as { content: { text: string }[] }).content[0]!.text) as { commits: { disclosures: string[] }[] };
    expect(rec.commits.some((c) => c.disclosures.includes("ai-trailer"))).toBe(true);
    // check tool → the gate fires
    const chk = JSON.parse((res.get(4)!.result as { content: { text: string }[] }).content[0]!.text) as { mode: string; pass: boolean };
    expect(chk.mode).toBe("required");
    expect(chk.pass).toBe(false);
    // list_host_adapters → both forges discoverable
    const adapters = (JSON.parse((res.get(5)!.result as { content: { text: string }[] }).content[0]!.text) as { adapters: { id: string }[] }).adapters.map((a) => a.id);
    expect(adapters).toEqual(expect.arrayContaining(["github", "azure-devops"]));
    // resolve_identity → the noreply handle
    const idn = JSON.parse((res.get(6)!.result as { content: { text: string }[] }).content[0]!.text) as { handle: string | null };
    expect(idn.handle).toBe("octocat");
  }, 30000);
});
