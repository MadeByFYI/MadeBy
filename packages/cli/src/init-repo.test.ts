import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { initRepo, acoStatus } from "./init-repo";
import { VERSION } from "./version";

const dirs: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "madeby-init-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("initRepo — scaffolds the ACO agent convention (the paved road)", () => {
  it("creates AGENTS.md with the ACO disclosure rule, alongside policy + workflow", () => {
    const root = tmp();
    const r = initRepo(root);
    expect(r.created).toContain("AGENTS.md");
    expect(existsSync(join(root, "AGENTS.md"))).toBe(true);
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(md).toContain("Authorship Certificate of Origin");
    expect(md).toContain(`npx madeby@${VERSION} me --with-ai`);
    expect(md).toMatch(/with_ai/);
    expect(r.created).toContain(".madeby/policy.json");
    expect(r.created).toContain(".github/workflows/disclosure.yml");
    expect(r.nextSteps.some((s) => s.includes("AGENTS.md ACO convention was added"))).toBe(true);
  });

  it("pins the madeby release in the CI file it writes, and keeps no credentials (GitHub and Azure)", () => {
    const version = (JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string }).version;
    const gh = tmp();
    initRepo(gh);
    const wf = readFileSync(join(gh, ".github", "workflows", "disclosure.yml"), "utf8");
    expect(wf).toContain(`version: "${version}"`);
    expect(wf).toContain("persist-credentials: false");
    const az = tmp();
    const r = initRepo(az, { host: "azure-devops" });
    expect(r.created).toContain(".madeby/azure-pipelines.yml");
    const pipe = readFileSync(join(az, ".madeby", "azure-pipelines.yml"), "utf8");
    expect(pipe).toContain(`npx --yes madeby@${version} check`);
    expect(pipe).toContain("persistCredentials: false");
    expect(pipe).toContain("fetchDepth: 0");
  });

  describe("Claude Code's commit trailer (.claude/settings.json)", () => {
    const settings = (root: string) => JSON.parse(readFileSync(join(root, ".claude", "settings.json"), "utf8"));
    const TRAILER = "Co-Authored-By: Claude Code <noreply@anthropic.com>";

    it("isn't touched in a repo with no sign of Claude Code, unless forced", () => {
      const root = tmp();
      const r0 = initRepo(root);
      expect(r0.claudeSettings).toEqual([]);
      expect(r0.nextSteps.some((x) => x.startsWith("No Claude Code files found"))).toBe(true);
      expect(existsSync(join(root, ".claude"))).toBe(false);
      expect(initRepo(root, { claudeCode: true }).claudeSettings).toEqual([{ file: ".claude/settings.json", status: "created" }]);
      expect(settings(root)).toEqual({ attribution: { commit: TRAILER } });
    });

    it("is created when the repo has a CLAUDE.md", () => {
      const root = tmp();
      writeFileSync(join(root, "CLAUDE.md"), "# CLAUDE.md\n");
      const r = initRepo(root);
      expect(r.claudeSettings).toEqual([{ file: ".claude/settings.json", status: "created" }]);
      expect(r.created).toContain(".claude/settings.json");
    });

    it("is merged into existing settings, keeping everything else", () => {
      const root = tmp();
      mkdirSync(join(root, ".claude"));
      writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify({ permissions: { allow: ["Bash(npm test)"] }, attribution: { pr: "" } }));
      expect(initRepo(root).claudeSettings[0]!.status).toBe("merged");
      expect(settings(root)).toEqual({ permissions: { allow: ["Bash(npm test)"] }, attribution: { pr: "", commit: TRAILER } });
      expect(initRepo(root).claudeSettings[0]!.status).toBe("kept"); // idempotent
    });

    it("never overrides a choice the team made, including turning it off", () => {
      for (const s of [{ attribution: false }, { attribution: { commit: "" } }, { includeCoAuthoredBy: false }]) {
        const root = tmp();
        mkdirSync(join(root, ".claude"));
        writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify(s));
        expect(initRepo(root).claudeSettings[0]!.status).toBe("kept");
        expect(settings(root)).toEqual(s);
      }
    });

    // #224: a monorepo whose app (and its Claude Code files) live below the root
    it("finds Claude Code files below the root and sets things up beside each", () => {
      const root = tmp();
      execFileSync("git", ["init", "-q"], { cwd: root });
      mkdirSync(join(root, "application", ".claude", "skills"), { recursive: true });
      writeFileSync(join(root, "application", "CLAUDE.md"), "# app\n");
      writeFileSync(join(root, "application", ".claude", "skills", "s.md"), "x\n");
      mkdirSync(join(root, "tools", "cli"), { recursive: true });
      writeFileSync(join(root, "tools", "cli", "CLAUDE.md"), "# cli\n");
      mkdirSync(join(root, "node_modules", "dep"), { recursive: true });
      writeFileSync(join(root, "node_modules", "dep", "CLAUDE.md"), "# not ours\n");
      writeFileSync(join(root, ".gitignore"), "node_modules/\n");
      const r = initRepo(root);
      expect(r.claudeSettings).toEqual([
        { file: "application/.claude/settings.json", status: "created" },
        { file: "tools/cli/.claude/settings.json", status: "created" },
      ]);
      expect(r.merged).toEqual(expect.arrayContaining(["application/CLAUDE.md", "tools/cli/CLAUDE.md"]));
      expect(readFileSync(join(root, "application", "CLAUDE.md"), "utf8")).toContain("Authorship Certificate of Origin");
      expect(existsSync(join(root, ".claude"))).toBe(false); // nothing at the root, which has no Claude Code files
      expect(existsSync(join(root, "node_modules", "dep", ".claude"))).toBe(false); // ignored files never count
    });

    it("a CLAUDE.md kept inside .claude/ belongs to the folder above it", () => {
      const root = tmp();
      execFileSync("git", ["init", "-q"], { cwd: root });
      mkdirSync(join(root, ".claude"));
      writeFileSync(join(root, ".claude", "CLAUDE.md"), "# x\n");
      expect(initRepo(root).claudeSettings).toEqual([{ file: ".claude/settings.json", status: "created" }]);
    });

    it("leaves a file it can't parse alone", () => {
      const root = tmp();
      mkdirSync(join(root, ".claude"));
      writeFileSync(join(root, ".claude", "settings.json"), "{ nope");
      expect(initRepo(root).claudeSettings[0]!.status).toBe("malformed");
      expect(readFileSync(join(root, ".claude", "settings.json"), "utf8")).toBe("{ nope");
    });
  });

  it("is idempotent — re-running skips AGENTS.md and never clobbers it", () => {
    const root = tmp();
    initRepo(root);
    const before = readFileSync(join(root, "AGENTS.md"), "utf8");
    const r2 = initRepo(root);
    expect(r2.skipped).toContain("AGENTS.md");
    expect(r2.created).not.toContain("AGENTS.md");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toBe(before);
  });

  it("MERGES the ACO rule into a pre-existing AGENTS.md without clobbering it", () => {
    const root = tmp();
    writeFileSync(join(root, "AGENTS.md"), "# my existing agents file\n\nBuild with `make`.\n");
    const r = initRepo(root);
    expect(r.merged).toContain("AGENTS.md");
    expect(r.created).not.toContain("AGENTS.md");
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(md).toContain("# my existing agents file"); // original content preserved
    expect(md).toContain("Build with `make`.");
    expect(md).toContain("## Authorship disclosure (ACO)"); // ACO section appended
    expect(md).toContain(`npx madeby@${VERSION} ai [tool]`);
    expect(r.nextSteps.some((s) => s.includes("Merged the ACO disclosure rule into your existing AGENTS.md"))).toBe(true);
  });

  it("merging is idempotent — re-running an already-merged file changes nothing", () => {
    const root = tmp();
    writeFileSync(join(root, "AGENTS.md"), "# existing\n");
    initRepo(root);
    const afterFirst = readFileSync(join(root, "AGENTS.md"), "utf8");
    const r2 = initRepo(root);
    expect(r2.skipped).toContain("AGENTS.md");
    expect(r2.merged).not.toContain("AGENTS.md");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toBe(afterFirst);
  });

  it("merges the rule into an existing CLAUDE.md, but never creates one", () => {
    // with a CLAUDE.md present → merged
    const a = tmp();
    writeFileSync(join(a, "CLAUDE.md"), "# project memory\n");
    const r = initRepo(a);
    expect(r.merged).toContain("CLAUDE.md");
    const cm = readFileSync(join(a, "CLAUDE.md"), "utf8");
    expect(cm).toContain("# project memory");
    expect(cm).toContain("## Authorship disclosure (ACO)");

    // with no CLAUDE.md → not created (AGENTS.md is the file we author)
    const b = tmp();
    const r2 = initRepo(b);
    expect(existsSync(join(b, "CLAUDE.md"))).toBe(false);
    expect(r2.created).not.toContain("CLAUDE.md");
    expect(r2.merged).not.toContain("CLAUDE.md");
  });
});

describe("initRepo — ACO convention drift detection + update", () => {
  // a legacy (pre-versioning) block: the old unversioned sentinel, run to end of file
  const LEGACY = "# AGENTS.md\n\n<!-- madeby:aco -->\n## The rule\n\nrun `npx madeby ai <session-log>`\n";
  // a versioned-but-older block (simulates a future bump): v0 fenced block
  const OLDER = "# AGENTS.md\n\n<!-- madeby:aco v0 -->\n## Authorship disclosure (ACO)\n\nold text\n<!-- /madeby:aco -->\n";

  it("acoStatus classifies absent / current / outdated / newer", () => {
    expect(acoStatus("# just a readme\n")).toBe("absent");
    expect(acoStatus(LEGACY)).toBe("outdated"); // legacy unversioned
    expect(acoStatus(OLDER)).toBe("outdated"); // v0 < current
    const fresh = tmp();
    initRepo(fresh);
    expect(acoStatus(readFileSync(join(fresh, "AGENTS.md"), "utf8"))).toBe("current");
    expect(acoStatus("<!-- madeby:aco v999 -->\nx\n<!-- /madeby:aco -->\n")).toBe("newer");
    // same convention version: the pinned release decides
    expect(acoStatus("<!-- madeby:aco v4 -->\n`npx madeby@0.0.1 me`\n<!-- /madeby:aco -->\n")).toBe("outdated");
    expect(acoStatus("<!-- madeby:aco v4 -->\n`npx madeby@99.0.0 me`\n<!-- /madeby:aco -->\n")).toBe("newer");
    expect(acoStatus(`<!-- madeby:aco v4 -->\n\`npx madeby@${VERSION} me\`\n<!-- /madeby:aco -->\n`)).toBe("current");
  });

  it("the merges line: only where conflicts are resolved in merges, or asked for, and it stays (v4)", () => {
    const plain = tmp();
    const r0 = initRepo(plain);
    expect(readFileSync(join(plain, "AGENTS.md"), "utf8")).not.toContain("--merges");
    expect(r0.merges).toBe(false);
    expect(r0.nextSteps.some((s) => s.includes("me --merges"))).toBe(false);

    const asked = tmp();
    const r = initRepo(asked, { merges: true });
    const md = readFileSync(join(asked, "AGENTS.md"), "utf8");
    expect(md).toContain(`npx madeby@${VERSION} me --merges`);
    expect(md).toContain("never run it for them");
    expect(r.merges).toBe(true);
    expect(r.nextSteps.some((s) => s.includes("me --merges"))).toBe(true);
    expect(existsSync(join(asked, ".git", "hooks", "prepare-commit-msg"))).toBe(false); // init leaves hooks alone
    // a refresh keeps it
    writeFileSync(join(asked, "AGENTS.md"), md.replace(`madeby@${VERSION}`, "madeby@0.0.1"));
    initRepo(asked, { update: true });
    expect(readFileSync(join(asked, "AGENTS.md"), "utf8")).toContain(`npx madeby@${VERSION} me --merges`);

    expect(initRepo(tmp(), { host: "azure-devops" }).merges).toBe(true);
  });

  it("the merges line is added when recent history resolves a conflict in a merge", () => {
    const d = tmp();
    const g = (...a: string[]) => execFileSync("git", ["-C", d, "-c", "user.name=W", "-c", "user.email=w@example.com", "-c", "commit.gpgsign=false", ...a], { stdio: "ignore" });
    g("init", "-q", "-b", "main");
    writeFileSync(join(d, "a.txt"), "base\n");
    g("add", "-A"); g("commit", "-q", "-m", "base");
    g("checkout", "-q", "-b", "task");
    writeFileSync(join(d, "a.txt"), "task\n");
    g("commit", "-qam", "task");
    g("checkout", "-q", "-");
    writeFileSync(join(d, "a.txt"), "main\n");
    g("commit", "-qam", "main");
    try { g("merge", "-q", "--no-edit", "task"); } catch { /* the conflict */ }
    writeFileSync(join(d, "a.txt"), "both\n");
    g("commit", "-qam", "merge");
    expect(initRepo(d).merges).toBe(true);
  });

  it("flags an outdated AGENTS.md but does NOT modify it without --update", () => {
    const root = tmp();
    writeFileSync(join(root, "AGENTS.md"), LEGACY);
    const r = initRepo(root);
    expect(r.outdated).toContain("AGENTS.md");
    expect(r.updated).not.toContain("AGENTS.md");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toBe(LEGACY); // untouched
    expect(r.nextSteps.some((s) => s.includes("OUTDATED") && s.includes("--update"))).toBe(true);
  });

  it("refreshes an outdated block in place with update:true, preserving surrounding content", () => {
    const root = tmp();
    const before = "# My AGENTS\n\nBuild: make.\n\n";
    const after = "\n## My own notes\n\nKeep this.\n";
    // a fenced v0 block between the user's own content
    writeFileSync(join(root, "AGENTS.md"), before + "<!-- madeby:aco v0 -->\n## old ACO\n\nold\n<!-- /madeby:aco -->\n" + after);
    const r = initRepo(root, { update: true });
    expect(r.updated).toContain("AGENTS.md");
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(md).toContain("# My AGENTS"); // content before preserved
    expect(md).toContain("Build: make.");
    expect(md).toContain("## My own notes"); // content AFTER the fenced block preserved
    expect(md).toContain("Keep this.");
    expect(md).toContain("<!-- madeby:aco v4 -->"); // refreshed to current version
    expect(md).toContain(`npx madeby@${VERSION} ai [tool]`); // current commands
    expect(md).not.toContain("old ACO");
    // and it's now current + idempotent
    expect(acoStatus(md)).toBe("current");
    const r2 = initRepo(root, { update: true });
    expect(r2.skipped).toContain("AGENTS.md");
    expect(r2.updated).not.toContain("AGENTS.md");
  });

  it("migrates a legacy unfenced block (replaces to end of file)", () => {
    const root = tmp();
    writeFileSync(join(root, "AGENTS.md"), LEGACY);
    const r = initRepo(root, { update: true });
    expect(r.updated).toContain("AGENTS.md");
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(md).toContain("# AGENTS.md"); // original title kept
    expect(md).toContain("<!-- madeby:aco v4 -->");
    expect(md).toContain("<!-- /madeby:aco -->");
    expect(md).not.toContain("madeby ai <session-log>"); // stale command gone
    expect(acoStatus(md)).toBe("current");
  });
});

describe("initRepo — the policy file honors an explicit --required (and never lowers one)", () => {
  const policy = (root: string) => JSON.parse(readFileSync(join(root, ".madeby", "policy.json"), "utf8"));

  it("raises an existing advisory policy to required, keeping its other fields", () => {
    const root = tmp();
    initRepo(root);
    writeFileSync(join(root, ".madeby", "policy.json"), JSON.stringify({ version: 0, mode: "advisory", accept: ["dco-signoff"] }));
    const r = initRepo(root, { mode: "required" });
    expect(r.raised).toEqual([".madeby/policy.json"]);
    expect(r.policyMode).toBe("required");
    expect(policy(root)).toEqual({ version: 0, mode: "required", accept: ["dco-signoff"] });
    expect(r.nextSteps.some((s) => s.includes('Raised .madeby/policy.json to "required"'))).toBe(true);
  });

  it("never lowers: plain init on a required repo leaves it required and reports it truthfully", () => {
    const root = tmp();
    initRepo(root, { mode: "required" });
    const r = initRepo(root);
    expect(r.raised).toEqual([]);
    expect(r.skipped).toContain(".madeby/policy.json");
    expect(r.policyMode).toBe("required");
    expect(policy(root).mode).toBe("required");
    expect(r.nextSteps.some((s) => s.startsWith("When ready to enforce"))).toBe(false);
  });

  it("reports the file's actual mode, not the requested one, when it leaves the policy alone", () => {
    const root = tmp();
    initRepo(root);
    const r = initRepo(root);
    expect(r.policyMode).toBe("advisory");
    expect(r.nextSteps.some((s) => s.includes("madeby init --required"))).toBe(true);
  });

  it("never rewrites a malformed policy — leaves it, reports advisory, and says how to fix it", () => {
    const root = tmp();
    initRepo(root);
    writeFileSync(join(root, ".madeby", "policy.json"), "{ not json");
    const r = initRepo(root, { mode: "required" });
    expect(r.raised).toEqual([]);
    expect(r.policyMode).toBe("advisory");
    expect(readFileSync(join(root, ".madeby", "policy.json"), "utf8")).toBe("{ not json");
    expect(r.nextSteps.some((s) => s.includes("is not a valid policy"))).toBe(true);
  });
});

describe("initRepo --record-model — opt-in: ask agents to name the model version", () => {
  it("default init does NOT ask for the model (naming models is the project's choice)", () => {
    const root = tmp();
    const r = initRepo(root);
    expect(r.recordModel).toBe(false);
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).not.toContain("--model");
    expect(JSON.parse(readFileSync(join(root, ".madeby/policy.json"), "utf8")).recordModel).toBeUndefined();
  });

  it("a fresh --record-model init writes the policy field and the AGENTS.md model line", () => {
    const root = tmp();
    const r = initRepo(root, { recordModel: true });
    expect(r.recordModel).toBe(true);
    expect(JSON.parse(readFileSync(join(root, ".madeby/policy.json"), "utf8"))).toEqual({ version: 0, mode: "advisory", recordModel: true });
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(md).toContain("--model <version>");
    expect(md).toContain("never guess");
    expect(acoStatus(md)).toBe("current");
  });

  it("turns it on in an already-initialized repo: policy keeps its fields, AGENTS.md block refreshed in place", () => {
    const root = tmp();
    initRepo(root, { mode: "required" });
    writeFileSync(join(root, "AGENTS.md"), "# Team notes\n\nkeep me\n\n" + readFileSync(join(root, "AGENTS.md"), "utf8").replace("# AGENTS.md\n\n", ""));
    const r = initRepo(root, { recordModel: true });
    expect(r.modelOn).toEqual([".madeby/policy.json"]);
    expect(r.updated).toContain("AGENTS.md");
    expect(JSON.parse(readFileSync(join(root, ".madeby/policy.json"), "utf8"))).toEqual({ version: 0, mode: "required", recordModel: true });
    const md = readFileSync(join(root, "AGENTS.md"), "utf8");
    expect(md).toContain("keep me");
    expect(md).toContain("--model <version>");
    expect(md.match(/madeby:aco v/g)!.length).toBe(1);
    // idempotent, and a plain init never turns it off or strips the line
    const again = initRepo(root);
    expect(again.modelOn).toEqual([]);
    expect(again.recordModel).toBe(true);
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toBe(md);
  });
});
