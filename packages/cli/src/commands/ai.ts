// `madeby ai [<log>] [<ref>]` — made by AI: the disclosure on-ramp. Reads your OWN AI-tool session
// log locally, confirms the AI's work is structurally present in your checkout, and writes witnessed
// span evidence to .madeby/spans. Privacy-clean: logs/content never leave the machine; only derived
// attribution is written. A thin renderer over the shared `recordAiSpans` library primitive.

import { recordAiSpans, writeParserSample } from "@madeby/analyzer";
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
  const positional = args.filter((a) => !a.startsWith("--"));

  // Contribution path: turn a log from an unsupported tool into a content-free format skeleton the
  // user can review and attach to an issue — so we can add a parser without their code/prompts ever
  // leaving the machine. (The spine: nothing leaves; the user shares the reviewed skeleton itself.)
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

  const res = recordAiSpans(root, { transcriptPath: positional[0], ref: positional[1] });

  if (res.error === "transcript-not-found") {
    console.error("madeby ai: session log not found — pass it: madeby ai <transcript.jsonl> [ref]");
    process.exit(1);
    return;
  }
  if (res.error === "unrecognized-format") {
    console.error(
      "madeby ai: unrecognized log format — no registered tool parser matched (Claude Code, aider, and\n" +
        "  SpecStory are supported today). Help add your tool WITHOUT sharing any code or prompts:\n" +
        "    madeby ai --make-parser-sample <log>   # writes a content-free format sample to review + share",
    );
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
