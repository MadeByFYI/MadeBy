import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { repoCoverage } from "./coverage";

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

  it("never throws outside a git repo (degrades to an empty report)", () => {
    const d = mkdtempSync(join(tmpdir(), "madeby-cov-nogit-"));
    dirs.push(d);
    const r = repoCoverage(d);
    expect(r.total).toBe(0);
    expect(r.known).toBe(0);
  });
});
