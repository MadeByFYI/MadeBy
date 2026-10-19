// `madeby coverage [<range>] [--json]` — the authorship-coverage scoreboard: how much of your repo's
// authorship is ON THE RECORD (known) vs undisclosed (unknown, never guessed), the human/with_ai/ai mix
// of the known, and the asserted-vs-verified trust split. Disclosure, not detection — a thin renderer
// over the shared `repoCoverage` primitive. The maintainer's scoreboard: it shows the gap, and points
// at `madeby check` to close it.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoCoverage, type CoverageReport } from "@madeby/analyzer";
import { parseDisclosurePolicy } from "@madeby/core";
import { repoRoot } from "../scope";

/** Is this repo's policy already enforcing? Fail-safe: missing or unreadable ⇒ not required. */
function policyIsRequired(root: string): boolean {
  const p = join(root, ".madeby", "policy.json");
  if (!existsSync(p)) return false;
  try {
    return parseDisclosurePolicy(JSON.parse(readFileSync(p, "utf8"))).mode === "required";
  } catch {
    return false;
  }
}

const pct = (n: number, d: number): number => (d > 0 ? Math.round((n / d) * 100) : 0);
/** a 20-cell bar for a 0..100 percentage */
const bar = (p: number): string => "█".repeat(Math.round(p / 5)) + "░".repeat(20 - Math.round(p / 5));

function render(r: CoverageReport, required: boolean): void {
  const knownPct = pct(r.known, r.total);
  const unknownPct = 100 - knownPct;
  console.log(`authorship coverage — ${r.scope}  (estimate · disclosure, not detection)`);
  if (r.total === 0) {
    console.log("  (no commits to score)");
    return;
  }
  console.log(`  known    ${String(knownPct).padStart(3)}%  ${bar(knownPct)}  disclosed — on the record`);
  console.log(`  unknown  ${String(unknownPct).padStart(3)}%  ${bar(unknownPct)}  no disclosure — origin unknown, never guessed`);

  if (r.known > 0) {
    const c = r.byCategory;
    const parts = [`human ${pct(c.human, r.known)}%`, `with_ai ${pct(c.with_ai, r.known)}%`, `ai ${pct(c.ai, r.known)}%`];
    if (c.bot > 0) parts.push(`bot ${pct(c.bot, r.known)}%`);
    console.log(`\n  of the ${r.known} known:  ${parts.join(" · ")}`);
    console.log(`  trust:  asserted ${pct(r.byTier.asserted, r.known)}% · verified ${pct(r.byTier.verified, r.known)}%  — self-reported; sign commits to verify`);
  }

  if (r.unknown > 0) {
    console.log(
      required
        ? `\n  → ${unknownPct}% unknown. Disclosure is already required on pull requests — the unknown is history the gate didn’t cover (e.g. from before it was on).`
        : `\n  → ${unknownPct}% unknown. Require disclosure going forward:  madeby init --required`,
    );
  }
}

export function coverageCommand(args: string[]): void {
  const json = args.includes("--json");
  const range = args.find((a) => !a.startsWith("--"));
  const root = repoRoot();
  if (!root) {
    console.error("madeby coverage: not a git repository.");
    process.exit(2);
    return;
  }
  const r = repoCoverage(root, { range });
  if (json) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  render(r, policyIsRequired(root));
}
