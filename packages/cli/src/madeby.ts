// The `madeby` CLI — the installable form of the same engine the mirror, index, and dev scripts
// use. Bundled with esbuild into a single standalone dist/madeby.mjs (which also sidesteps the
// type-stripping import constraints the scripts/*.mjs dev entries have to work around), so
// `npx madeby …` runs on plain Node with no monorepo layout and no flags.
//
// The commands, all honest-by-construction:
//   madeby check      — evaluate commits against .madeby/policy.json (the maintainer disclosure gate)
//   madeby recognize  — the raw disclosure primitive (per-commit kinds, no policy) to compose on
//   madeby prove      — capture your own AI session log's witnessed spans into .madeby/spans

import { checkCommand } from "./commands/check";
import { recognizeCommand } from "./commands/recognize";
import { proveCommand } from "./commands/prove";
import { startMcpServer } from "./mcp";

function help(): void {
  console.log(`madeby — verifiable content provenance

Usage:
  madeby check [<range>]         Evaluate commits against .madeby/policy.json (disclosure gate).
                                 <range> e.g. origin/main..HEAD; in CI the PR range is auto-detected.
                                 --json for a machine-readable result (exit code still gates).
  madeby recognize [<range>]     The raw disclosure primitive: per-commit disclosure kinds, no policy.
                                 Compose it into your own gate/dashboard/index. --json for structured output.
  madeby prove [<log>] [<ref>]   Capture your AI session log's witnessed spans into .madeby/spans.
                                 <log> defaults to the auto-discovered Claude Code transcript.
  madeby mcp                     Run the MCP server (stdio) — the primitives as agent-callable tools.
  madeby help                    Show this help.

Disclosure, never detection: madeby states what origin was disclosed; it never asserts whether
code is AI. What a project requires is set in its .madeby/policy.json — the maintainer's call.`);
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case "check":
    checkCommand(rest);
    break;
  case "recognize":
    recognizeCommand(rest);
    break;
  case "mcp":
    startMcpServer();
    break;
  case "prove":
  case "capture":
    proveCommand(rest);
    break;
  case undefined:
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    console.error(`madeby: unknown command '${cmd}'\n`);
    help();
    process.exit(2);
}
