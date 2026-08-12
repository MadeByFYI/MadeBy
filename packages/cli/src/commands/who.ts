// `madeby who [<path>] [--lines=A-B] [--json]`  (alias: `madeby whom`) — made by whom? Read what's ON
// THE RECORD about who made this. With a path: one file's origin — witnessed AI spans (model-named,
// precise) where captured, last-touch commit disclosure from git blame elsewhere, unknown otherwise.
// With no path: a repo-wide map (the orientation to read before you work). Disclosure, not detection:
// it reports what's disclosed and never asserts "human". Thin renderer over provenanceOf/provenanceMap.

import { provenanceOf, provenanceMap } from "@madeby/analyzer";
import { repoRoot } from "../scope";

function parseLines(arg: string | undefined): { startLine?: number; endLine?: number } {
  if (!arg) return {};
  const m = /^--lines=(\d+)(?:-(\d+))?$/.exec(arg);
  if (!m) return {};
  const startLine = Number(m[1]);
  const endLine = m[2] ? Number(m[2]) : startLine;
  return { startLine, endLine };
}

export function whoCommand(args: string[]): void {
  const json = args.includes("--json");
  const path = args.find((a) => !a.startsWith("--"));
  const { startLine, endLine } = parseLines(args.find((a) => a.startsWith("--lines=")));

  const root = repoRoot();
  if (!root) {
    console.error("madeby who: not a git repository.");
    process.exit(2);
    return;
  }

  if (path) {
    const res = provenanceOf(root, path, { startLine, endLine });
    if (json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.log(`made by whom? — ${res.path}${startLine ? ` (lines ${startLine}-${endLine})` : ""}`);
    if (res.records.length === 0) {
      console.log("  (no record — origin unknown)");
      return;
    }
    for (const r of res.records) {
      const span = r.startLine ? `${r.startLine}-${r.endLine ?? r.startLine}` : "—";
      console.log(`  [${r.confidence}] L${span}  ${r.evidence}`);
    }
    return;
  }

  const map = provenanceMap(root, {});
  if (json) {
    console.log(JSON.stringify(map, null, 2));
    return;
  }
  console.log(map.summary);
  for (const w of map.witnessed) {
    console.log(`  ✎ ${w.path}  [${w.models.join(", ")}]`);
  }
}
