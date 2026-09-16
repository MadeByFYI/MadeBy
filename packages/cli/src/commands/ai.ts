// `madeby ai [tool]` — made by AI: attest that an AI authored HEAD, by adding an `Authored-by-ai:
// <tool>` trailer (asserted tier — no session log, works anywhere). The AI-authorship counterpart of
// `madeby me`; the committer stays the accountable human. This is the honest, log-free `ai` disclosure.
//
// `madeby ai --witness [<log>] [<ref>]` — the EVIDENCE upgrade: read your OWN AI-tool session log
// locally, confirm the AI's work is structurally present in the checkout, and write witnessed span
// evidence to .madeby/spans. Privacy-clean: logs/content never leave the machine; only derived
// attribution is written. A thin renderer over the shared `recordAiSpans` primitive.
//
// `madeby ai --make-parser-sample <log>` — contribution path: a content-free format skeleton to help
// add a parser for an unsupported tool, without any code or prompts leaving the machine.

import { recordAiSpans, writeParserSample } from "@madeby/analyzer";
import { attestAiAuthorship } from "./me";
import { repoRoot } from "../scope";

const ISSUE_URL = "https://github.com/MadeByFYI/MadeBy/issues/new";

export function aiCommand(args: string[]): void {
  const root = repoRoot();
  if (!root) {
    console.error("madeby ai: not a git repository.");
    process.exit(2);
    return;
  }

  const makeSample = args.includes("--make-parser-sample");
  const witness = args.includes("--witness");
  const positional = args.filter((a) => !a.startsWith("--"));

  // Contribution path (unchanged): a content-free format skeleton for an unsupported tool's log.
  if (makeSample) {
    const s = writeParserSample(root, { transcriptPath: positional[0] });
    if (s.error === "transcript-not-found") {
      console.error("madeby ai: session log not found — pass it: madeby ai --make-parser-sample <log>");
      process.exit(1);
      return;
    }
    console.log(
      `madeby ai: ${s.message}.\n` +
        `  → It contains only the log's structure + model ids — all code, prompts, paths, and secrets\n` +
        `    were redacted locally. Review it, then attach it to a new issue so we can add a parser:\n` +
        `    ${ISSUE_URL}`,
    );
    process.exit(0);
    return;
  }

  // Evidence upgrade (opt-in): witnessed spans from a local session log.
  if (witness) {
    const res = recordAiSpans(root, { transcriptPath: positional[0], ref: positional[1] });
    if (res.error === "transcript-not-found") {
      console.error("madeby ai --witness: session log not found — pass it: madeby ai --witness <transcript.jsonl> [ref]");
      process.exit(1);
      return;
    }
    if (res.error === "unrecognized-format") {
      console.error(
        "madeby ai --witness: unrecognized log format — no registered tool parser matched (Claude Code,\n" +
          "  aider, and SpecStory today). The asserted disclosure still works — run plain `madeby ai` — or\n" +
          "  help add your tool: madeby ai --make-parser-sample <log>.",
      );
      process.exit(1);
      return;
    }
    if (!res.written) {
      console.log(`madeby ai --witness: ${res.message}. Nothing recorded.`);
      process.exit(0);
      return;
    }
    console.log(
      `madeby ai --witness: wrote ${res.path} — [${res.tool}] ${res.matched} witnessed file(s) matched, ` +
        `${res.discarded} discarded (not present in the checkout).`,
    );
    return;
  }

  // Default: assert AI authorship via a trailer (asserted tier — no session log needed).
  const tool = positional[0] || "AI";
  const r = attestAiAuthorship(root, { tool });
  if (!r.ok) {
    if (r.reason === "staged-changes") {
      console.error("madeby ai: you have staged changes. Commit them first — `ai` attests HEAD, not your index.");
    } else {
      console.error("madeby ai: no commit to attest — make a commit first.");
    }
    process.exit(1);
    return;
  }
  if (!r.changed) {
    console.log("madeby ai: HEAD already attests AI authorship. Nothing to do.");
    process.exit(0);
    return;
  }
  console.log(
    `madeby ai: attested AI authorship on HEAD — "${r.subject}" (Authored-by-ai: ${r.tool}).\n` +
      "  → asserted tier. For evidence-backed spans from your session log: madeby ai --witness [log].",
  );
}
