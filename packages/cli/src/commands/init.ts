// `madeby init [--required] [--record-model] [--host <id>]` — align this repo with MadeBy: write .madeby/policy.json
// (advisory by default) and the CI disclosure check. Idempotent (never clobbers existing files; the
// one deliberate change is --required raising an existing advisory policy to required). A
// thin renderer over the shared `initRepo` — the same one the MCP `init` tool calls.

import { initRepo } from "../init-repo";
import { repoRoot } from "../scope";

export function initCommand(args: string[]): void {
  const root = repoRoot();
  if (!root) {
    console.error("madeby init: not a git repository.");
    process.exit(2);
    return;
  }

  const mode = args.includes("--required") ? "required" : "advisory";
  const update = args.includes("--update");
  const recordModel = args.includes("--record-model");
  const hostIdx = args.indexOf("--host");
  const host = hostIdx >= 0 ? args[hostIdx + 1] : undefined;

  const r = initRepo(root, { mode, host, update, recordModel });

  for (const f of r.created) console.log(`  + ${f}`);
  for (const f of r.merged) console.log(`  ~ ${f} (merged in the ACO rule)`);
  for (const f of r.updated) console.log(`  ↑ ${f} (ACO convention refreshed to the current version)`);
  for (const f of r.raised) console.log(`  ↑ ${f} (mode raised to required)`);
  for (const f of r.modelOn) console.log(`  ↑ ${f} (now records the model version)`);
  for (const f of r.outdated) console.log(`  ! ${f} (ACO convention OUTDATED — run 'madeby init --update')`);
  for (const f of r.skipped) console.log(`  · ${f} (exists — left as-is)`);
  console.log(`\nmadeby init — policy: ${r.policyMode}${r.recordModel ? " + records model" : ""}, host: ${r.host}`);
  console.log("Next:");
  for (const s of r.nextSteps) console.log(`  - ${s}`);
}
