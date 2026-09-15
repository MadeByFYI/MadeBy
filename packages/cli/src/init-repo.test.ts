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
    expect(md).toContain("npx madeby me --with-ai");
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

  it("respects a pre-existing AGENTS.md and points the maintainer to the rule instead", () => {
    const root = tmp();
    writeFileSync(join(root, "AGENTS.md"), "# my existing agents file\n");
    const r = initRepo(root);
    expect(r.skipped).toContain("AGENTS.md");
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toBe("# my existing agents file\n");
    expect(r.nextSteps.some((s) => s.includes("add the ACO disclosure rule"))).toBe(true);
  });
});
