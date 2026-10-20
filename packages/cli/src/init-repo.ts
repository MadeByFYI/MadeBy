// `initRepo` — align a repository with MadeBy in one call: write `.madeby/policy.json`, the ACO
// `AGENTS.md` convention, and the CI disclosure check. Shared by the `madeby init` command and the MCP
// `init` tool, so a human or an agent onboards a repo identically. Idempotent, and **drift-aware**: the
// ACO convention block is versioned + delimited, so init can detect when a seeded repo carries an
// outdated block and — with { update: true } — refresh just that block in place, never clobbering the
// rest of the file.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseDisclosurePolicy } from "@madeby/core";

// The ACO block is versioned and fenced by an open+close marker. Bump ACO_VERSION whenever ACO_BODY
// changes; repos seeded with an older version then report as outdated until `madeby init --update`.
// The legacy (pre-versioning) marker `<!-- madeby:aco -->` is recognized too and migrated on update.
const ACO_VERSION = 1;
const ACO_OPEN = `<!-- madeby:aco v${ACO_VERSION} -->`;
const ACO_CLOSE = `<!-- /madeby:aco -->`;
// Matches any ACO open marker: the versioned form (capturing the version) or the legacy unversioned one.
const ACO_OPEN_RE = /<!-- madeby:aco(?: v(\d+))? -->/;

const ACO_BODY = `## Authorship disclosure (ACO)

When you author or modify content here, **disclose who authored it** — per
[ACO, the Authorship Certificate of Origin](https://github.com/MadeByFYI/MadeBy/blob/main/ACO.md).
After you commit, run the command for the honest category (no install, no setup):

- **ai** — an AI authored it (the committer stays accountable): \`npx madeby@latest ai [tool]\`
- **with_ai** — a human authored it with AI assistance: \`npx madeby@latest me --with-ai [tool]\`
- **human** — a human authored it: \`npx madeby@latest me\`

Disclose per commit, honestly. Undisclosed content stays *unknown*, never guessed.
`;

// The opt-in model line (`init --record-model`): this repo also records which model version did the
// work. Opt-in, not default — naming models is a project's choice (the Linux kernel chose not to).
const MODEL_LINE = `
**This repo also records the model.** Name your tool as usual — madeby reads the model from the
tool's own record of the session where it can (Cursor, Copilot CLI, Claude Code), e.g.
\`npx madeby@latest me --with-ai Cursor\` writes \`Assisted-by: Cursor:<model>\`. Elsewhere add
\`--model <version>\` with the exact model you are running as. If you don't know it, leave it off —
never guess.
`;

/** The delimited, versioned ACO block — the unit init inserts and `--update` replaces. */
const acoBlock = (recordModel: boolean): string =>
  `${ACO_OPEN}\n${ACO_BODY}${recordModel ? MODEL_LINE : ""}${ACO_CLOSE}\n`;

export interface InitOptions {
  /** policy mode to seed (default "advisory" — reports, never fails) */
  mode?: "advisory" | "required";
  /** CI host to wire (default "github"; "azure-devops" is guided; others get a generic next-step) */
  host?: string;
  /** refresh an outdated ACO convention block in place (drift update) rather than just report it */
  update?: boolean;
  /** ask AI disclosures to name the model version too (policy `recordModel` + the AGENTS.md line) */
  recordModel?: boolean;
}

export interface InitResult {
  /** files written from scratch */
  created: string[];
  /** files that already existed and already carried a current ACO rule — left untouched */
  skipped: string[];
  /** existing agent files the ACO section was appended into (not clobbered) */
  merged: string[];
  /** files whose outdated ACO block was refreshed to the current version (update mode) */
  updated: string[];
  /** files carrying an outdated ACO block, when not updating — the caller should prompt to refresh */
  outdated: string[];
  /** an existing policy whose mode was raised to "required" (only ever on an explicit required request) */
  raised: string[];
  /** a policy that started recording the model this call (only ever on an explicit request) */
  modelOn: string[];
  /** the mode the repo's policy file actually carries after init (not merely the mode requested) */
  policyMode: string;
  /** does the repo's policy now ask AI disclosures to name the model version? */
  recordModel: boolean;
  host: string;
  nextSteps: string[];
}

/** The drift status of an agent file's ACO block, relative to the current convention version. */
export type AcoStatus = "absent" | "current" | "outdated" | "newer";

interface AcoBlockLoc { version: number | null; start: number; end: number; }

/** Locate the ACO block in a file. Null if none. Handles versioned + legacy (unfenced) markers. */
function findAcoBlock(content: string): AcoBlockLoc | null {
  const m = ACO_OPEN_RE.exec(content);
  if (!m) return null;
  const start = m.index;
  const version = m[1] !== undefined ? Number(m[1]) : null;
  const closeIdx = content.indexOf(ACO_CLOSE, start);
  let end: number;
  if (closeIdx !== -1) {
    end = closeIdx + ACO_CLOSE.length;
    if (content[end] === "\n") end += 1; // absorb one trailing newline
  } else {
    end = content.length; // legacy / unfenced block ran to end of file
  }
  return { version, start, end };
}

/** The ACO drift status of an agent file's content. */
export function acoStatus(content: string): AcoStatus {
  const loc = findAcoBlock(content);
  if (!loc) return "absent";
  if (loc.version === null || loc.version < ACO_VERSION) return "outdated"; // legacy or older
  if (loc.version > ACO_VERSION) return "newer"; // written by a newer madeby — don't downgrade
  return "current";
}

/** Replace the located ACO block with the given one, preserving everything else. */
function replaceAcoBlock(content: string, loc: AcoBlockLoc, block: string): string {
  return content.slice(0, loc.start) + block + content.slice(loc.end);
}

function writeIfAbsent(abs: string, rel: string, content: string, created: string[], skipped: string[]): void {
  if (existsSync(abs)) {
    skipped.push(rel);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  created.push(rel);
}

// Ensure the policy file exists and honors an explicit request to enforce. Absent ⇒ write it with the
// requested mode (created). Present ⇒ leave it, except that a "required" request raises an advisory
// policy to required, keeping every other field (raised). Never lowers a policy: plain init on a
// required repo changes nothing. A malformed file is never rewritten — `check` already degrades it to
// advisory, and fixing it is the maintainer's call (malformed). Returns the mode the file now carries.
// The same holds for recordModel: an explicit request turns it on (modelOn); nothing turns it off.
function ensurePolicy(
  abs: string,
  rel: string,
  want: { mode: "advisory" | "required"; recordModel: boolean },
  res: Pick<InitResult, "created" | "skipped" | "raised" | "modelOn">,
): { mode: string; recordModel: boolean; malformed: boolean } {
  if (!existsSync(abs)) {
    mkdirSync(dirname(abs), { recursive: true });
    const fresh = { version: 0, mode: want.mode, ...(want.recordModel ? { recordModel: true } : {}) };
    writeFileSync(abs, JSON.stringify(fresh, null, 2) + "\n");
    res.created.push(rel);
    return { mode: want.mode, recordModel: want.recordModel, malformed: false };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf8"));
  } catch {
    res.skipped.push(rel);
    return { mode: "advisory", recordModel: false, malformed: true };
  }
  const isObject = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const current = parseDisclosurePolicy(raw);
  const raise = want.mode === "required" && current.mode !== "required" && isObject;
  const modelOn = want.recordModel && !current.recordModel && isObject;
  if (raise || modelOn) {
    const next = { ...(raw as Record<string, unknown>), ...(raise ? { mode: "required" } : {}), ...(modelOn ? { recordModel: true } : {}) };
    writeFileSync(abs, JSON.stringify(next, null, 2) + "\n");
    if (raise) res.raised.push(rel);
    if (modelOn) res.modelOn.push(rel);
  } else {
    res.skipped.push(rel);
  }
  return { mode: raise ? "required" : current.mode, recordModel: modelOn || current.recordModel === true, malformed: !isObject };
}

// Ensure an agent file carries a current ACO rule. Absent file + createIfAbsent ⇒ write the full
// convention (created). No ACO block yet ⇒ append the section (merged). Outdated block ⇒ refresh it in
// place when `update`, else flag it (outdated). Current/newer ⇒ leave it (skipped) — except that a
// current block missing the model line is refreshed when the model was explicitly asked for this call.
function ensureAco(
  abs: string,
  rel: string,
  res: Pick<InitResult, "created" | "skipped" | "merged" | "updated" | "outdated">,
  opts: { createIfAbsent: boolean; update: boolean; recordModel: boolean; modelRequested: boolean },
): void {
  const block = acoBlock(opts.recordModel);
  if (!existsSync(abs)) {
    if (!opts.createIfAbsent) return;
    mkdirSync(dirname(abs), { recursive: true });
    // A fresh AGENTS.md: minimal header + the ACO block (so the whole convention is the updatable block).
    writeFileSync(abs, `# AGENTS.md\n\n${block}`);
    res.created.push(rel);
    return;
  }
  const content = readFileSync(abs, "utf8");
  const status = acoStatus(content);
  const loc = findAcoBlock(content);
  if (status === "absent") {
    const sep = content.endsWith("\n") ? "" : "\n";
    // leading blank line separates it from prior content
    writeFileSync(abs, content + sep + `\n${block}`);
    res.merged.push(rel);
  } else if (status === "current" && opts.modelRequested && loc && content.slice(loc.start, loc.end) !== block) {
    writeFileSync(abs, replaceAcoBlock(content, loc, block));
    res.updated.push(rel);
  } else if (status === "outdated") {
    if (opts.update) {
      writeFileSync(abs, replaceAcoBlock(content, loc!, block));
      res.updated.push(rel);
    } else {
      res.outdated.push(rel);
    }
  } else {
    res.skipped.push(rel); // current or newer
  }
}

export function initRepo(root: string, opts: InitOptions = {}): InitResult {
  const mode = opts.mode ?? "advisory";
  const host = opts.host ?? "github";
  const update = opts.update ?? false;
  const created: string[] = [];
  const skipped: string[] = [];
  const merged: string[] = [];
  const updated: string[] = [];
  const outdated: string[] = [];
  const raised: string[] = [];
  const modelOn: string[] = [];
  const res = { created, skipped, merged, updated, outdated, raised, modelOn };
  const modelRequested = opts.recordModel ?? false;

  const policy = ensurePolicy(join(root, ".madeby", "policy.json"), ".madeby/policy.json", { mode, recordModel: modelRequested }, res);
  // The convention follows the policy file, so a later plain `init --update` keeps the model line.
  const aco = { update, recordModel: policy.recordModel, modelRequested };
  // AGENTS.md — the cross-tool convention: create it, merge the rule in, or refresh a drifted block.
  ensureAco(join(root, "AGENTS.md"), "AGENTS.md", res, { createIfAbsent: true, ...aco });
  // CLAUDE.md — Claude Code reads this preferentially; merge/refresh if the repo has one (never create).
  ensureAco(join(root, "CLAUDE.md"), "CLAUDE.md", res, { createIfAbsent: false, ...aco });
  if (host === "github") {
    writeIfAbsent(join(root, ".github", "workflows", "disclosure.yml"), ".github/workflows/disclosure.yml", GH_WORKFLOW, created, skipped);
  }

  const nextSteps: string[] = ["Commit the created files."];
  if (raised.length > 0) {
    nextSteps.push('Raised .madeby/policy.json to "required" — undisclosed commits now fail the check. To make it block merges, also mark the check required on the protected branch (see madeby://guide/enforce).');
  }
  if (modelOn.length > 0 || (modelRequested && created.includes(".madeby/policy.json"))) {
    nextSteps.push("This repo now asks AI disclosures to name the model version (recordModel in .madeby/policy.json; the AGENTS.md rule says how: --model <version>). `madeby coverage` lists each agent · model pairing. It never changes the gate.");
  }
  if (policy.malformed) {
    nextSteps.push(".madeby/policy.json is not a valid policy, so the check treats it as advisory. It was left untouched — fix it (e.g. { \"version\": 0, \"mode\": \"required\" }) to enforce.");
  }
  if (created.includes("AGENTS.md")) {
    nextSteps.push("An AGENTS.md ACO convention was added — agents that read it disclose authorship (e.g. 'npx madeby@latest ai [tool]'). Tune it to your repo's tools.");
  }
  if (merged.length > 0) {
    nextSteps.push(`Merged the ACO disclosure rule into your existing ${merged.join(" + ")} — review the appended "Authorship disclosure (ACO)" section and tune it to your repo.`);
  }
  if (updated.length > 0) {
    nextSteps.push(`Refreshed an outdated ACO convention in ${updated.join(" + ")} to the current version — review the change before committing.`);
  }
  if (outdated.length > 0) {
    nextSteps.push(`${outdated.join(" + ")} carries an OUTDATED ACO convention — run 'madeby init --update' to refresh it in place (only the ACO block changes).`);
  }
  if (host === "azure-devops") {
    nextSteps.push("Add the Azure Pipelines template (packages/action/azure-pipelines-disclosure.yml) and wire it as a PR build-validation branch policy.");
  } else if (host !== "github") {
    nextSteps.push(`Add a CI step that runs 'npx madeby check' on pull requests for ${host}.`);
  }
  if (policy.mode !== "required") {
    nextSteps.push('When ready to enforce: run \'madeby init --required\' (or set "mode": "required" in .madeby/policy.json), then make the check required on the protected branch — the host\'s control plane (GitHub: gh api branch protection; Azure: a build-validation policy). See the MCP resource madeby://guide/enforce for exact commands.');
  }
  nextSteps.push("Contributors disclose origin with a Co-Authored-By / Generated-by trailer (AI), an Authored-by-human trailer ('madeby me'), an Authored-by-ai trailer ('madeby ai' — AI authored, committer accountable), a DCO Signed-off-by, or a signed commit. Evidence upgrade: 'madeby ai --witness' records your own AI session's witnessed spans.");
  nextSteps.push("Existing history is accounted for honestly, not fabricated: run 'madeby check' over full history to recognize what's already disclosed; pre-adoption commits stay unknown. See madeby://guide/backfill.");

  return { created, skipped, merged, updated, outdated, raised, modelOn, policyMode: policy.mode, recordModel: policy.recordModel, host, nextSteps };
}

// The GitHub Actions workflow (mirrors the quickstart; pinned action tag; fetch-depth:0 so the gate
// can auto-scope to the PR's own commits).
const GH_WORKFLOW = `name: Disclosure
on: pull_request
jobs:
  madeby:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: MadeByFYI/MadeBy/packages/action@v0.2.0
`;
