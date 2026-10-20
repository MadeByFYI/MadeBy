import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { agentName, repoCoverage } from "./coverage";

const dirs: string[] = [];
const git = (dir: string, ...a: string[]): string =>
  execFileSync("git", ["-C", dir, "-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const repo = (): string => {
  const d = mkdtempSync(join(tmpdir(), "madeby-cov-"));
  dirs.push(d);
  git(d, "init", "-q", "-b", "main");
  return d;
};
const commit = (d: string, file: string, msg: string): void => {
  writeFileSync(join(d, file), file + "\n");
  git(d, "add", "-A");
  git(d, "commit", "--no-verify", "-m", msg);
};
afterAll(() => {
  for (const x of dirs) rmSync(x, { recursive: true, force: true });
});

describe("repoCoverage — the honest authorship scoreboard", () => {
  it("counts known vs unknown, the category mix, and the tier split — never guessing", () => {
    const d = repo();
    commit(d, "a.ts", "feat: a\n\nAuthored-by-human: Dev <dev@example.com>"); // human
    commit(d, "b.ts", "feat: b\n\nAuthored-by-human: Dev <dev@example.com>\nAssisted-by: Cursor"); // with_ai
    commit(d, "c.ts", "feat: c\n\nAuthored-by-ai: Claude Code"); // ai
    commit(d, "d.ts", "feat: d"); // UNDISCLOSED → unknown (must NOT count as human)
    commit(d, "e.ts", "feat: e\n\nSigned-off-by: Dev <dev@example.com>"); // DCO only → unknown authorship category

    const r = repoCoverage(d);
    expect(r.isEstimate).toBe(true);
    expect(r.total).toBe(5);
    expect(r.known).toBe(3); // a, b, c
    expect(r.unknown).toBe(2); // d (nothing), e (DCO discloses accountability, not human-vs-AI)
    expect(r.byCategory).toMatchObject({ human: 1, with_ai: 1, ai: 1, bot: 0 });
    // all asserted (no signed commits in this repo)
    expect(r.byTier.asserted).toBe(3);
    expect(r.byTier.verified).toBe(0);
  });

  it("an all-undisclosed repo is 0 known / all unknown — never inferred human", () => {
    const d = repo();
    commit(d, "a.ts", "chore: init");
    commit(d, "b.ts", "feat: thing");
    const r = repoCoverage(d);
    expect(r.known).toBe(0);
    expect(r.unknown).toBe(2);
    expect(r.byCategory.human).toBe(0); // the honesty guarantee
  });

  // A merge is scored only when it changes content of its own (a conflict resolution): selection by
  // content, never by disclosure — so a disclosed plain merge must NOT sneak into "known".
  it("scores merges with changes of their own, and only those", () => {
    const d = repo();
    commit(d, "base.ts", "chore: base\n\nAuthored-by-human: Dev <dev@example.com>");
    // plain merge: no conflict, nothing authored — excluded even though it carries a disclosure
    git(d, "checkout", "-q", "-b", "side");
    commit(d, "side.ts", "feat: side\n\nAuthored-by-human: Dev <dev@example.com>");
    git(d, "checkout", "-q", "main");
    commit(d, "main.ts", "feat: main\n\nAuthored-by-human: Dev <dev@example.com>");
    git(d, "merge", "-q", "--no-ff", "side", "-m", "Merge side\n\nCo-Authored-By: Claude <noreply@anthropic.com>");
    // conflicted merges: both sides edit one file and the merge resolves it to new content
    const conflict = (branch: string, msg: string): void => {
      git(d, "checkout", "-q", "-b", branch);
      writeFileSync(join(d, "shared.ts"), `${branch}\n`);
      git(d, "add", "-A");
      git(d, "commit", "--no-verify", "-q", "-m", `feat: ${branch}\n\nAuthored-by-human: Dev <dev@example.com>`);
      git(d, "checkout", "-q", "main");
      writeFileSync(join(d, "shared.ts"), `main-${branch}\n`);
      git(d, "add", "-A");
      git(d, "commit", "--no-verify", "-q", "-m", `feat: main-${branch}\n\nAuthored-by-human: Dev <dev@example.com>`);
      try {
        git(d, "merge", "-q", branch);
      } catch {
        /* expected conflict */
      }
      writeFileSync(join(d, "shared.ts"), `resolved-${branch}\n`);
      git(d, "add", "-A");
      git(d, "commit", "--no-verify", "-q", "-m", msg);
    };
    conflict("fix1", "Merge fix1\n\nCo-Authored-By: Claude <noreply@anthropic.com>"); // disclosed → with_ai
    conflict("fix2", "Merge fix2"); // undisclosed → unknown, never guessed

    const r = repoCoverage(d);
    // 7 non-merge commits (base, side, main, fix1, main-fix1, fix2, main-fix2) + the 2 conflict merges
    expect(r.total).toBe(9);
    expect(r.known).toBe(8);
    expect(r.unknown).toBe(1); // the undisclosed conflict merge
    expect(r.byCategory.with_ai).toBe(1); // the disclosed conflict merge; the disclosed plain merge isn't scored
    expect(r.scope).toContain("2 merges with changes of their own");

    // a range scopes merges the same way: the last merge plus the branch commit it brought in
    const ranged = repoCoverage(d, { range: "HEAD~1..HEAD" });
    expect(ranged.total).toBe(2); // fix2 + its merge
    expect(ranged.unknown).toBe(1); // the merge
  });

  it("a limited window only scores merges inside it", () => {
    const d = repo();
    commit(d, "a.ts", "chore: a");
    git(d, "checkout", "-q", "-b", "x");
    writeFileSync(join(d, "s.ts"), "x\n");
    git(d, "add", "-A");
    git(d, "commit", "--no-verify", "-q", "-m", "x");
    git(d, "checkout", "-q", "main");
    writeFileSync(join(d, "s.ts"), "m\n");
    git(d, "add", "-A");
    git(d, "commit", "--no-verify", "-q", "-m", "m");
    try {
      git(d, "merge", "-q", "x");
    } catch {
      /* expected conflict */
    }
    writeFileSync(join(d, "s.ts"), "resolved\n");
    git(d, "add", "-A");
    git(d, "commit", "--no-verify", "-q", "-m", "Merge x");
    // make the window end after the merge: later commits dated well after it
    const later = (f: string): void => {
      writeFileSync(join(d, f), f);
      git(d, "add", "-A");
      execFileSync("git", ["-C", d, "-c", "user.name=Dev", "-c", "user.email=dev@example.com", "commit", "--no-verify", "-q", "-m", f], {
        env: { ...process.env, GIT_COMMITTER_DATE: "2099-01-01T00:00:00Z", GIT_AUTHOR_DATE: "2099-01-01T00:00:00Z" },
      });
    };
    later("p.ts");
    later("q.ts");
    expect(repoCoverage(d, { limit: 2 }).total).toBe(2); // window = p, q; the older merge is outside it
    expect(repoCoverage(d).total).toBe(6); // a, x, m, p, q + the merge (window not full ⇒ all history)
  });

  it("names the agents and model versions disclosed in AI commits — as written, never inferred", () => {
    const d = repo();
    commit(d, "a.ts", "feat: a\n\nCo-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>");
    commit(d, "b.ts", "feat: b\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>");
    // a tool and its model on one commit count under each — once, even if repeated
    commit(d, "c.ts", "feat: c\n\nAuthored-by-human: Dev <dev@example.com>\nAssisted-by: Claude Code\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>");
    commit(d, "d.ts", "feat: d\n\nAuthored-by-human: Dev <dev@example.com>\nAssisted-by: Cursor");
    commit(d, "e.ts", "feat: e\n\nAuthored-by-human: Dev <dev@example.com>"); // human — no agent row
    commit(d, "f.ts", "feat: f"); // unknown — no agent row

    const r = repoCoverage(d);
    expect(r.byCategory.with_ai).toBe(4);
    expect(r.byAgent).toEqual([
      { name: "Claude Opus 5", provider: "anthropic", commits: 2 }, // "(1M context)" groups with plain
      { name: "Claude Code", provider: "anthropic", commits: 1 },
      { name: "Claude Sonnet 5", provider: "anthropic", commits: 1 },
      { name: "Cursor", provider: "cursor", commits: 1 },
    ]);
  });

  it("a tool:model disclosure is one row per pairing — the same model under two agents stays two", () => {
    const d = repo();
    commit(d, "a.ts", "feat: a\n\nAuthored-by-human: Dev <dev@example.com>\nAssisted-by: Cursor:claude-sonnet-5");
    commit(d, "b.ts", "feat: b\n\nAuthored-by-human: Dev <dev@example.com>\nAssisted-by: Cursor:claude-sonnet-5");
    commit(d, "c.ts", "feat: c\n\nAuthored-by-ai: Claude Code:claude-sonnet-5");
    expect(repoCoverage(d).byAgent).toEqual([
      { name: "Cursor · claude-sonnet-5", provider: "cursor", tool: "Cursor", model: "claude-sonnet-5", commits: 2 },
      { name: "Claude Code · claude-sonnet-5", provider: "anthropic", tool: "Claude Code", model: "claude-sonnet-5", commits: 1 },
    ]);
  });

  it("agentName drops the email and trailing parentheticals, keeps the version", () => {
    expect(agentName("Claude Opus 4.8 (1M context) <noreply@anthropic.com>")).toBe("Claude Opus 4.8");
    expect(agentName("Claude Haiku 4.5 <noreply@anthropic.com>")).toBe("Claude Haiku 4.5");
    expect(agentName("copilot-swe-agent[bot] 198982749+Copilot@users.noreply.github.com")).toBe("copilot-swe-agent[bot]");
    expect(agentName("AI")).toBe("AI");
  });

  it("never throws outside a git repo (degrades to an empty report)", () => {
    const d = mkdtempSync(join(tmpdir(), "madeby-cov-nogit-"));
    dirs.push(d);
    const r = repoCoverage(d);
    expect(r.total).toBe(0);
    expect(r.known).toBe(0);
  });
});
