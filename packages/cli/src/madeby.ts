// The `madeby` CLI — the installable form of the same engine the mirror, index, and dev scripts
// use. Bundled with esbuild into a single standalone dist/madeby.mjs (which also sidesteps the
// type-stripping import constraints the scripts/*.mjs dev entries have to work around), so
// `npx madeby …` runs on plain Node with no monorepo layout and no flags.
//
// The surface is "made by ___": two conventions (init, check) and the disclosure family.
//   madeby init   — set MadeBy up: .madeby/policy.json + the CI disclosure check
//   madeby check  — the gate: do commits meet the policy? (a verdict; the exit code gates)
//   madeby who    — made by whom? read what's on the record about who made this (file or repo)
//   madeby ai     — made by AI: record your own AI session's witnessed spans
//   madeby me     — made by me: affirm you authored HEAD yourself (the symmetric human claim)

import { checkCommand } from "./commands/check";
import { aiCommand } from "./commands/ai";
import { meCommand } from "./commands/me";
import { whoCommand } from "./commands/who";
import { initCommand } from "./commands/init";
import { startMcpServer } from "./mcp";

function help(): void {
  console.log(`madeby — verifiable content provenance ("made by whom?")

Usage:
  madeby init                    Set MadeBy up: write .madeby/policy.json + the CI disclosure check.
                                 --required to enforce now; --host azure-devops for Azure Pipelines.
  madeby check [<range>]         The gate: do commits meet .madeby/policy.json? (a verdict — exit
                                 code gates). <range> e.g. origin/main..HEAD; in CI it's auto-detected.
                                 --json for a machine-readable result.
  madeby who [<path>]            Made by whom? Read what's on the record about who made this — one
   (alias: whom)                 file's origin, or the whole repo with no path. --lines=A-B to scope.
  madeby ai [<log>] [<ref>]      Made by AI: record your AI session's witnessed spans into .madeby/spans.
                                 <log> defaults to the auto-discovered Claude Code transcript.
  madeby me                      Made by me: affirm you authored HEAD yourself (an Authored-by-human
                                 trailer — the symmetric human claim to \`ai\`).
  madeby mcp                     Run the MCP server (stdio) — the tools, agent-callable.
  madeby help                    Show this help.

Disclosure, never detection: madeby states what origin was disclosed; it never asserts whether
code is AI. What a project requires is set in its .madeby/policy.json — the maintainer's call.`);
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case "init":
    initCommand(rest);
    break;
  case "check":
    checkCommand(rest);
    break;
  case "who":
  case "whom":
    whoCommand(rest);
    break;
  case "ai":
    aiCommand(rest);
    break;
  case "me":
    meCommand(rest);
    break;
  case "mcp":
    startMcpServer();
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
