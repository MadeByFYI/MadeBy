import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { repoCoverage } from "./coverage";
import { readDisclosureCommits, rangeHead } from "./late-disclosure";
import { readDisclosures } from "./read-disclosures";

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const as = (d: string, who: string, ...a: string[]): string =>
  execFileSync("git", ["-C", d, "-c", `user.name=${who}`, "-c", `user.email=${who.toLowerCase()}@example.com`, "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const repo = (): string => {
  const d = mkdtempSync(join(tmpdir(), "madeby-late-"));
  dirs.push(d);
  as(d, "Wren", "init", "-q", "-b", "main");
  return d;
};
/** a commit with content, returning its full hash */
const work = (d: string, who: string, file: string, msg: string): string => {
  writeFileSync(join(d, file), file + "\n");
  as(d, who, "add", "-A");
  as(d, who, "commit", "--no-verify", "-q", "-m", msg);
  return as(d, who, "rev-parse", "HEAD");
};
/** an empty disclosure commit naming `shas` */
const disclose = (d: string, who: string, shas: string[], trailers: string): string => {
  as(d, who, "commit", "--allow-empty", "--no-verify", "-q", "-m", `Disclose authorship of ${shas.length} earlier commits`, "-m", [...shas.map((s) => `Discloses: ${s}`), trailers].join("\n"));
  return as(d, who, "rev-parse", "HEAD");
};
const WITH_AI = "Authored-by-human: Wren <wren@example.com>\nAssisted-by: Claude Code";

describe("disclosure commits — disclosing earlier commits without rewriting them", () => {
  it("fill in the named commits, and aren't scored themselves", () => {
    const d = repo();
    const a = work(d, "Wren", "a.ts", "feat: a");
    const b = work(d, "Wren", "b.ts", "feat: b");
    disclose(d, "Wren", [a, b], WITH_AI);
    const r = repoCoverage(d);
    expect(r.total).toBe(2); // a, b — not the disclosure commit
    expect(r.known).toBe(2);
    expect(r.late).toBe(2);
    expect(r.byCategory.with_ai).toBe(2);
    const rows = readDisclosures(d);
    expect(rows.map((x) => x.late)).toEqual([expect.any(String), expect.any(String)]);
    expect(rows.every((x) => x.disclosures.includes("human-attestation"))).toBe(true);
  });

  it("only the author's own commits, and only earlier ones", () => {
    const d = repo();
    const kai = work(d, "Kai", "k.ts", "feat: kai's");
    as(d, "Wren", "checkout", "-q", "-b", "side");
    const later = work(d, "Wren", "s.ts", "feat: on another branch");
    as(d, "Wren", "checkout", "-q", "main");
    disclose(d, "Wren", [kai, later], WITH_AI);
    const r = readDisclosureCommits(d);
    expect(r.applied.size).toBe(0);
    expect(r.rejected.map((x) => x.reason).sort()).toEqual(["not-an-ancestor", "other-author"]);
    expect(repoCoverage(d).known).toBe(0);
  });

  it("the commit's own message comes first", () => {
    const d = repo();
    const a = work(d, "Wren", "a.ts", "feat: a\n\nAuthored-by-ai: Claude Code");
    disclose(d, "Wren", [a], "Authored-by-human: Wren <wren@example.com>");
    const r = repoCoverage(d);
    expect(r.byCategory).toMatchObject({ ai: 1, human: 0 });
    expect(r.late).toBe(0);
  });

  it("a later disclosure commit corrects an earlier one", () => {
    const d = repo();
    const a = work(d, "Wren", "a.ts", "feat: a");
    disclose(d, "Wren", [a], WITH_AI);
    disclose(d, "Wren", [a], "Authored-by-ai: Claude Code");
    expect(repoCoverage(d).byCategory).toMatchObject({ ai: 1, with_ai: 0 });
  });

  it("one that changes content is an ordinary commit; its Discloses: lines are ignored", () => {
    const d = repo();
    const a = work(d, "Wren", "a.ts", "feat: a");
    work(d, "Wren", "b.ts", `feat: b\n\nDiscloses: ${a}\n${WITH_AI}`);
    const r = repoCoverage(d);
    expect(r.total).toBe(2);
    expect(r.late).toBe(0);
    expect(readDisclosureCommits(d).disclosureCommits.size).toBe(0);
  });

  it("apply to a range's commits from a disclosure commit at its tip", () => {
    const d = repo();
    const base = work(d, "Wren", "base.ts", "chore: base\n\nAuthored-by-human: Wren <wren@example.com>");
    const a = work(d, "Wren", "a.ts", "feat: a");
    disclose(d, "Wren", [a], WITH_AI);
    const rows = readDisclosures(d, { range: `${base}..HEAD` });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.late).toBeDefined();
  });

  it("rangeHead: the tip a range reaches", () => {
    expect(rangeHead()).toBe("HEAD");
    expect(rangeHead("origin/dev..task/1")).toBe("task/1");
    expect(rangeHead("a...b")).toBe("b");
    expect(rangeHead("origin/dev..")).toBe("HEAD");
    expect(rangeHead("v1.2")).toBe("v1.2");
  });
});
