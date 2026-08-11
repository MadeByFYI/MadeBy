// `madeby init [--required] [--host <id>]` — align this repo with MadeBy: write .madeby/policy.json
// (advisory by default) and the CI disclosure check. Idempotent (never clobbers existing files). A
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
  const hostIdx = args.indexOf("--host");
  const host = hostIdx >= 0 ? args[hostIdx + 1] : undefined;

  const r = initRepo(root, { mode, host });

  for (const f of r.created) console.log(`  + ${f}`);
  for (const f of r.skipped) console.log(`  · ${f} (exists — left as-is)`);
  console.log(`\nmadeby init — policy: ${r.policyMode}, host: ${r.host}`);
  console.log("Next:");
  for (const s of r.nextSteps) console.log(`  - ${s}`);
}
