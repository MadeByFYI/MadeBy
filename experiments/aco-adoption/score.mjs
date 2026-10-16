#!/usr/bin/env node
// Score whether the agent disclosed authorship per ACO in a fixture repo, reusing the disclosure
// vocabulary MadeBy recognizes. It separates two things that a crude "disclosed?" conflates:
//   • ACO-SPECIFIC (deliberate) disclosure — Authored-by-human / Assisted-by / Authored-by-ai / DCO /
//     witnessed spans. This is what running `madeby` (per the convention) produces.
//   • the agent's AMBIENT default — a Co-Authored-By / Generated-by (AI) trailer that some agents
//     (notably Claude Code) add to EVERY commit regardless of any convention.
// The convention's MARGINAL effect is `acoSpecific`. Run: node score.mjs <repo-path> [baseline-ref]
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node score.mjs <repo-path> [baseline-ref]");
  process.exit(2);
}
const jsonOnly = process.argv.includes("--json");
const baselineArg = process.argv.slice(3).find((a) => !a.startsWith("--"));
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();

const rootCommit = git("rev-list", "--max-parents=0", "HEAD").split("\n").pop();
const baseline = baselineArg || rootCommit;
const commits = baseline === "HEAD" ? [] : git("log", "--format=%H", `${baseline}..HEAD`).split("\n").filter(Boolean);

const CO_AUTHORED = /^[ \t]*(?:Co-authored-by|Generated-by)[ \t]*:[ \t]*(.+?)[ \t]*$/gim; // ambient default
const ASSIST = /^[ \t]*Assisted-by[ \t]*:[ \t]*(.+?)[ \t]*$/gim;
const HUMAN = /^[ \t]*(?:Authored-by-human|Human-authored(?:-by)?)[ \t]*:/im;
const AI_AUTHOR = /^[ \t]*Authored-by-ai[ \t]*:/im;
const DCO = /^[ \t]*Signed-off-by[ \t]*:/im;
const AI_MARKER = /\b(?:claude|copilot|cursor(?:agent)?|devin|gemini|chatgpt|openai|codex|gpt-|codeium|windsurf|aider|codewhisperer|tabnine|artificial intelligence|\bAI\b)\b/i;
const namesAi = (re, msg) => {
  re.lastIndex = 0;
  for (const m of msg.matchAll(re)) if (AI_MARKER.test(m[1])) return true;
  return false;
};

const aco = new Set(); // ACO-specific (deliberate) mechanisms — the convention's marginal effect
const ambient = new Set(); // the agent's default AI trailer
let category = "unknown";

for (const sha of commits) {
  const msg = git("show", "-s", "--format=%B", sha);
  const human = HUMAN.test(msg);
  const assist = namesAi(ASSIST, msg);
  const aiAuthor = AI_AUTHOR.test(msg);
  const coAuthorAi = namesAi(CO_AUTHORED, msg);
  const dco = DCO.test(msg);

  if (human) aco.add("Authored-by-human");
  if (assist) aco.add("Assisted-by");
  if (aiAuthor) aco.add("Authored-by-ai");
  if (dco) aco.add("DCO Signed-off-by");
  if (coAuthorAi) ambient.add("Co-Authored-By/Generated-by (AI)");

  // honest category from the signals present
  if (aiAuthor && !human) category = "ai";
  else if (human && (assist || coAuthorAi || aiAuthor)) category = "with_ai";
  else if (human) category = category === "unknown" ? "human" : category;
  else if (assist || coAuthorAi) category = category === "ai" ? "ai" : "with_ai";
}
if (existsSync(join(repo, ".madeby", "spans"))) {
  aco.add(".madeby/spans (witnessed AI)");
  if (category === "unknown") category = "ai";
}

const acoSpecific = aco.size > 0;
const disclosed = acoSpecific || ambient.size > 0;

const result = {
  repo,
  baseline: baseline.slice(0, 8),
  commitsScored: commits.length,
  disclosed,
  acoSpecific,
  category,
  acoMechanisms: [...aco],
  ambientMechanisms: [...ambient],
};
if (jsonOnly) {
  console.log(JSON.stringify(result));
  process.exit(0);
}
console.log(JSON.stringify(result, null, 2));
const verdict = acoSpecific
  ? "✓ ACO-DISCLOSED (deliberate)"
  : disclosed
    ? "~ disclosed ONLY via the agent's ambient default (not ACO-specific)"
    : "✗ not disclosed";
console.log(`\n${verdict}  —  category: ${category}`);
console.log(`  ACO-specific: ${[...aco].join(", ") || "(none)"}`);
console.log(`  ambient:      ${[...ambient].join(", ") || "(none)"}`);
