import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, it, expect } from "vitest";
import { initRepo } from "./init-repo";

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
    expect(md).toContain("npx madeby@latest me --with-ai");
    expect(md).toMatch(/with_ai/);
    expect(r.created).toContain(".madeby/policy.json");
    expect(r.created).toContain(".github/workflows/disclosure.yml");
    expect(r.nextSteps.some((s) => s.includes("AGENTS.md ACO convention was added"))).toBe(true);
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
    expect(md).toContain("npx madeby@latest ai [tool]");
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
