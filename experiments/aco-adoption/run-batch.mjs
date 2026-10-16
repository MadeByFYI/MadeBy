#!/usr/bin/env node
// Automated batch: run N headless Claude Code trials per condition, score each, aggregate the rate.
// Each trial = a fresh fixture + `claude -p <task> --permission-mode bypassPermissions` + score.mjs.
// Faithful (real Claude Code, real task, no mention of disclosure) but hands-off. Usage: node run-batch.mjs [N=5]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const N = Number(process.argv[2] || 5);
// Optional: condition filter ("with-convention" | "control" | "both") + inter-run delay seconds.
const CONDITIONS = (() => {
  const c = process.argv[3];
  return c === "with-convention" || c === "control" ? [c] : ["with-convention", "control"];
})();
const DELAY_S = Number(process.argv[4] || 0);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = join(HERE, "runs", `batch-${stamp}`);
mkdirSync(OUT, { recursive: true });
const LOG = join(OUT, "results.tsv");
writeFileSync(LOG, "condition\ttrial\tacoSpecific\tcategory\tmechanisms\tnote\n");

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
const UTIL = `// A small utility library.\nexport function slugify(text) {\n  throw new Error("not implemented");\n}\n`;
const TASK =
  'In this repository, implement the slugify(text) function in src/util.js — it currently throws ' +
  '"not implemented". It should: lowercase the input and trim surrounding whitespace, replace any run ' +
  'of non-alphanumeric characters with a single hyphen, and strip any leading or trailing hyphens. For ' +
  'example, slugify("  Hello, World!  ") -> "hello-world". Add a small test file that checks a couple ' +
  "of cases, then commit your work.";

// The agent invocation is parameterized so the same harness drives any headless coding agent.
// Default: Claude Code. Set AGENT=cursor for Cursor (needs `cursor-agent login` first).
const AGENT = process.env.AGENT || "claude";
const AGENTS = {
  claude: { bin: "claude", args: (task) => ["-p", task, "--permission-mode", "bypassPermissions"], label: "Claude Code" },
  cursor: { bin: "cursor-agent", args: (task) => ["-p", task, "--force"], label: "Cursor" },
};
const AG = AGENTS[AGENT] || AGENTS.claude;

const git = (dir, ...a) =>
  execFileSync("git", ["-C", dir, "-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" });

function scaffold(cond, i) {
  const dir = join(OUT, `${cond}-${i}`);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "util.js"), UTIL);
  writeFileSync(join(dir, "README.md"), "# fixture — a small utility library\n");
  if (cond === "with-convention") writeFileSync(join(dir, "AGENTS.md"), AGENTS_MD);
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--no-verify", "-m", "chore: initial scaffold");
  return dir;
}

const summary = {
  "with-convention": { aco: 0, total: 0, cats: {} },
  control: { aco: 0, total: 0, cats: {} },
};

for (const cond of CONDITIONS) {
  for (let i = 1; i <= N; i++) {
    if (DELAY_S && (i > 1 || cond !== CONDITIONS[0])) await sleep(DELAY_S);
    const dir = scaffold(cond, i);
    let note = "";
    try {
      execFileSync(AG.bin, AG.args(TASK), {
        cwd: dir,
        timeout: 360000,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch (e) {
      note = e && (e.signal === "SIGTERM" || /ETIMEDOUT/i.test(String(e.message))) ? "timeout" : "run-error";
    }
    let r = { acoSpecific: false, category: "error", acoMechanisms: [] };
    try {
      const out = execFileSync("node", [join(HERE, "score.mjs"), dir, "--json"], { encoding: "utf8" });
      r = JSON.parse(out.trim().split("\n").pop());
    } catch {
      note = note || "score-error";
    }
    const s = summary[cond];
    s.total++;
    if (r.acoSpecific) s.aco++;
    s.cats[r.category] = (s.cats[r.category] || 0) + 1;
    appendFileSync(LOG, `${cond}\t${i}\t${r.acoSpecific}\t${r.category}\t${(r.acoMechanisms || []).join("|")}\t${note}\n`);
    process.stderr.write(`  [${cond} ${i}/${N}] acoSpecific=${r.acoSpecific} category=${r.category}${note ? " (" + note + ")" : ""}\n`);
  }
}

const pct = (a, t) => (t ? Math.round((a / t) * 100) : 0);
const wc = summary["with-convention"];
const cc = summary.control;
const report = [
  `ACO adoption — automated batch — ${AG.label} — ${stamp} — N=${N} per condition`,
  ``,
  `with-convention:  ACO-disclosed ${wc.aco}/${wc.total} (${pct(wc.aco, wc.total)}%)   categories: ${JSON.stringify(wc.cats)}`,
  `control:          ACO-disclosed ${cc.aco}/${cc.total} (${pct(cc.aco, cc.total)}%)   categories: ${JSON.stringify(cc.cats)}`,
  ``,
  `per-trial log: ${LOG}`,
].join("\n");
writeFileSync(join(OUT, "summary.txt"), report + "\n");
console.log(report);
