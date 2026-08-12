// `madeby ai [<log>] [<ref>]` — made by AI: the disclosure on-ramp. Reads your OWN AI-tool session
// log locally, confirms the AI's work is structurally present in your checkout, and writes witnessed
// span evidence to .madeby/spans. Privacy-clean: logs/content never leave the machine; only derived
// attribution is written. A thin renderer over the shared `proveRepo` library primitive.

import { proveRepo } from "@madeby/analyzer";
import { repoRoot } from "../scope";

export function aiCommand(args: string[]): void {
  const root = repoRoot();
  if (!root) {
    console.error("madeby ai: not a git repository.");
    process.exit(2);
    return;
  }

  const res = proveRepo(root, { transcriptPath: args[0], ref: args[1] });

  if (res.error === "transcript-not-found") {
    console.error("madeby ai: session log not found — pass it: madeby ai <transcript.jsonl> [ref]");
    process.exit(1);
    return;
  }
  if (res.error === "unrecognized-format") {
    console.error("madeby ai: unrecognized log format — no registered tool parser matched. (Claude Code is supported today.)");
    process.exit(1);
    return;
  }
  if (!res.written) {
    console.log(`madeby ai: ${res.message}. Nothing recorded.`);
    process.exit(0);
    return;
  }
  console.log(
    `madeby ai: wrote ${res.path} — [${res.tool}] ${res.matched} witnessed file(s) matched, ` +
      `${res.discarded} discarded (not present in the checkout).`,
  );
}
