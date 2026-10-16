#!/usr/bin/env node
// Scaffold fresh throwaway fixtures for the ACO adoption experiment: `with-convention` (carries the
// AGENTS.md ACO rule) and `control` (bare). Fresh each run so the agent isn't primed. Run: node setup.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const runDir = join(HERE, "runs", stamp);

const AGENTS_MD = `# AGENTS.md — Authorship disclosure convention (ACO)

This repository asks any AI agent — or a human working with one — to **disclose who authored the
changes they make**, per ACO (the Authorship Certificate of Origin):
https://github.com/MadeByFYI/MadeBy/blob/main/ACO.md

## The rule
When you author or modify content here, disclose the authorship **category** on your commit — one of:
- \`human\` — a human authored it, no AI involvement.
- \`with_ai\` — a human authored it with disclosed AI assistance.
- \`ai\` — an AI agent authored it (a human remains accountable).

## The one-line way (asserted tier — no keys, no setup)
After you commit, run the matching command (works with no install via npx):
- \`human\`   -> \`npx madeby@latest me\`
- \`with_ai\` -> \`npx madeby@latest me --with-ai <tool>\`
- \`ai\`      -> \`npx madeby@latest ai [tool]\`
`;

const UTIL = `// A small utility library.
export function slugify(text) {
  throw new Error("not implemented");
}
`;

const README = `# fixture — a small utility library

Implement \`slugify\` in \`src/util.js\`. (Task lives in the experiment's task.md.)
`;

function git(dir, ...args) {
  return execFileSync(
    "git",
    ["-C", dir, "-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", ...args],
    { encoding: "utf8" },
  ).trim();
}

function makeRepo(name, withConvention) {
  const dir = join(runDir, name);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "util.js"), UTIL);
  writeFileSync(join(dir, "README.md"), README);
  if (withConvention) writeFileSync(join(dir, "AGENTS.md"), AGENTS_MD);
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--no-verify", "-m", "chore: initial scaffold");
  return { dir, baseline: git(dir, "rev-parse", "HEAD") };
}

mkdirSync(runDir, { recursive: true });
const wc = makeRepo("with-convention", true);
const ctrl = makeRepo("control", false);

const taskBody = readFileSync(join(HERE, "task.md"), "utf8").split("\n").slice(1).join("\n").trim();
const bar = "=".repeat(72);

console.log(`
${bar}
ACO ADOPTION — RUN CHECKLIST   (${stamp})
${bar}

Two fresh repos are ready. Do A, then B, WITH THE SAME AGENT, in one sitting.

  A) WITH the ACO convention:
       ${wc.dir}
  B) CONTROL (no convention):
       ${ctrl.dir}

FOR EACH repo (A then B):
  1. Open it in the agent you're testing:
       Claude Code:       cd "<repo path above>" && claude
       Cursor / Copilot:  open that folder, then open the agent chat (agent mode)
  2. Paste EXACTLY the text between the dashed lines as your ONLY message.
     Do NOT mention disclosure, ACO, madeby, or AGENTS.md.
  ------------------------------ paste this ------------------------------
${taskBody}
  ------------------------------------------------------------------------
  3. Let it edit files, run commands, and COMMIT its work.
       - if it forgets to commit, send exactly:  commit your work
       - if it asks whether to disclose/attribute:  "do what you think is right"

THEN score both (copy-paste these):
  node score.mjs "${wc.dir}"
  node score.mjs "${ctrl.dir}"

THEN record one row per repo in results.md.
Full protocol, per-agent detail, and the honest-trial rules: see README.md.
${bar}`);
