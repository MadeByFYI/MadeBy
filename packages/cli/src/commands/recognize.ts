// `madeby recognize [<range>] [--json]` — the raw disclosure-recognition PRIMITIVE. For each commit
// it reports the disclosure kinds present (AI trailer / DCO sign-off / signature), with NO policy
// applied. This is the unopinionated atom others compose in their OWN runtime — a custom gate, a
// dashboard, an index — without shipping code to us (ARCHITECTURE §12, "primitives you run, not code
// you ship"). It never gates (always exit 0 unless not a git repo); the opinion lives in `check`, or
// in whatever you build on top.

import { readGitLog } from "@madeby/analyzer";
import { commitDisclosureKinds } from "@madeby/core";
import { repoRoot, resolveRange } from "../scope";

export function recognizeCommand(args: string[]): void {
  const json = args.includes("--json");
  const explicit = args.find((a) => !a.startsWith("--"));

  const root = repoRoot();
  if (!root) {
    console.error("madeby recognize: not a git repository.");
    process.exit(2);
    return;
  }

  const { range, autoHost } = resolveRange(explicit);
  const commits = readGitLog(root, range ? undefined : 200, range);
  const rows = commits.map((c) => {
    const disclosures = commitDisclosureKinds({ message: c.message, signed: c.signed });
    return {
      sha: (c.sha ?? "").slice(0, 8) || "(unknown)",
      subject: (c.message.split("\n")[0] ?? "").slice(0, 72),
      disclosed: disclosures.length > 0,
      disclosures,
    };
  });

  if (json) {
    console.log(JSON.stringify({ range: range ?? null, autoHost: autoHost ?? null, commits: rows }, null, 2));
    return;
  }

  if (autoHost) console.log(`madeby recognize: auto-scoped to the ${autoHost} PR range.`);
  for (const r of rows) {
    console.log(`${r.disclosed ? "✓" : "✗"} ${r.sha}  [${r.disclosures.join(", ") || "—"}]  ${r.subject}`);
  }
  const disclosed = rows.filter((r) => r.disclosed).length;
  console.log(`— ${disclosed}/${rows.length} commits disclose origin (no policy applied).`);
}
