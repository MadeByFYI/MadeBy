// `initRepo` — align a repository with MadeBy in one call: write `.madeby/policy.json`, the ACO
// `AGENTS.md` convention, and the CI disclosure check. Shared by the `madeby init` command and the MCP
// `init` tool, so a human or an agent onboards a repo identically. Idempotent, and **drift-aware**: the
// ACO convention block is versioned + delimited, so init can detect when a seeded repo carries an
// outdated block and — with { update: true } — refresh just that block in place, never clobbering the
// rest of the file.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseDisclosurePolicy } from "@madeby/core";
import { VERSION } from "./version";

// The ACO block is versioned and fenced by an open+close marker. Bump ACO_VERSION whenever ACO_BODY
// changes; repos seeded with an older version then report as outdated until `madeby init --update`.
// The legacy (pre-versioning) marker `<!-- madeby:aco -->` is recognized too and migrated on update.
// v3: the commands pin the exact madeby release (`npx madeby@<version>`), as the CI file does — agents
// run them on developers' machines, which hold credentials. A block pinned to an older release reports
// as outdated too, so `init --update` moves the pin in one reviewed commit, like a dependency update.
// v4: merges — a developer's agent suggests the per-clone merge declaration (`me --merges`) once. Hooks
// aren't part of the repo, so this rule, which every developer's agent reads, is what reaches them all.
const ACO_VERSION = 4;
const ACO_OPEN = `<!-- madeby:aco v${ACO_VERSION} -->`;
const ACO_CLOSE = `<!-- /madeby:aco -->`;
// Matches any ACO open marker: the versioned form (capturing the version) or the legacy unversioned one.
const ACO_OPEN_RE = /<!-- madeby:aco(?: v(\d+))? -->/;

const PKG = `madeby@${VERSION}`;
const ACO_BODY = `## Authorship disclosure (ACO)

When you author or modify content here, **disclose who authored it** — per
[ACO, the Authorship Certificate of Origin](https://github.com/MadeByFYI/MadeBy/blob/main/ACO.md).
After you commit, run the command for the honest category (no install, no setup):

- **ai** — an AI authored it (the committer stays accountable): \`npx ${PKG} ai [tool]\`
- **with_ai** — a human authored it with AI assistance: \`npx ${PKG} me --with-ai [tool]\`
- **human** — a human authored it: \`npx ${PKG} me\`

If your platform makes the commit for you (a cloud coding agent that pushes through its own tool),
amending afterwards can be lost — put the disclosure in the message instead, with \`--print\`:
\`git commit -m "<message>" -m "$(npx ${PKG} ai [tool] --print)"\`.

**Merges.** A merge where conflicts were fixed by hand is scored like any commit. If
\`git config madeby.merge\` prints nothing in this clone, tell the developer once that
\`npx ${PKG} me --merges\` (or \`me --with-ai [tool] --merges\`, \`ai [tool] --merges\`) makes the
merges they finish here carry their disclosure. It's their declaration: never run it for them.

Disclose per commit, honestly. Undisclosed content stays *unknown*, never guessed. (The madeby
version is pinned on purpose; \`npx madeby@latest init --update\` moves it to the newest release.)
`;

// The opt-in model line (`init --record-model`): this repo also records which model version did the
// work. Opt-in, not default — naming models is a project's choice (the Linux kernel chose not to).
const MODEL_LINE = `
**This repo also records the model.** Name your tool as usual — madeby reads the model from the
tool's own record of the session where it can (Cursor, Copilot CLI, Claude Code), e.g.
\`npx ${PKG} me --with-ai Cursor\` writes \`Assisted-by: Cursor:<model>\`. Elsewhere add
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
  /**
   * turn Claude Code's commit trailer on for the repo (`.claude/settings.json`) even without signs the
   * repo uses Claude Code; by default it's done only when there's a CLAUDE.md or a .claude/ folder
   */
  claudeCode?: boolean;
}

/**
 * What init did with one Claude Code shared settings file: created it, merged the trailer setting into
 * it, kept a value the team already set (including turning it off on purpose), or skipped a file it
 * couldn't parse.
 */
export type ClaudeSettingsStatus = "created" | "merged" | "kept" | "malformed";

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
  /**
   * Claude Code's commit trailer, per `.claude/settings.json` init handled — one beside each place the
   * repo uses Claude Code (a CLAUDE.md or .claude/ folder, at any depth). Empty ⇒ none found.
   */
  claudeSettings: { file: string; status: ClaudeSettingsStatus }[];
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
  // same convention version: the pinned release decides (older pin ⇒ outdated, newer ⇒ leave it)
  const pin = /npx madeby@(\d+)\.(\d+)\.(\d+)/.exec(content.slice(loc.start, loc.end));
  if (pin) {
    const [a, b, c] = VERSION.split(".").map(Number) as [number, number, number];
    const cmp = Number(pin[1]) - a || Number(pin[2]) - b || Number(pin[3]) - c;
    if (cmp < 0) return "outdated";
    if (cmp > 0) return "newer";
  }
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

// Claude Code's commit trailer, set in the repo's shared settings. Claude Code adds `Co-Authored-By` to
// its commits unless a developer turns it off; a shared project setting overrides their personal one
// (user < shared project < local < managed), so the repo gets the trailer back for those who turned it
// off. Setting it means fixed text — there's no placeholder for the model — so the model is recorded by
// `init --record-model` instead. A team's own explicit value, "off" included, is theirs and never touched.
export const CLAUDE_TRAILER = "Co-Authored-By: Claude Code <noreply@anthropic.com>";

/**
 * The folders (relative to the root, "" for the root) where the repo uses Claude Code: each one holding
 * a CLAUDE.md or a .claude/ folder, at any depth. Claude Code reads the .claude/settings.json of the
 * folder it's launched from, so a monorepo whose app lives in application/ needs the setting there.
 * Reads git's view of the tree (tracked, plus untracked files that aren't ignored), so dependencies and
 * build output never count.
 */
export function claudeCodeDirs(root: string): string[] {
  const dirs = new Set<string>();
  if (existsSync(join(root, "CLAUDE.md")) || existsSync(join(root, ".claude"))) dirs.add("");
  let files: string[] = [];
  try {
    files = execFileSync("git", ["-C", root, "-c", "core.quotePath=false", "ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).split("\n");
  } catch {
    /* not a repo / no git: the root check above stands */
  }
  for (const f of files) {
    const parts = f.split("/");
    // the folder that holds a .claude/ (the first one on the path), else the one holding a CLAUDE.md —
    // a CLAUDE.md kept inside .claude/ belongs to the folder above it
    const at = parts.indexOf(".claude");
    if (at >= 0 && at < parts.length - 1) dirs.add(parts.slice(0, at).join("/"));
    else if (parts[parts.length - 1] === "CLAUDE.md") dirs.add(parts.slice(0, -1).join("/"));
  }
  return [...dirs].sort();
}

function ensureClaudeSettings(abs: string): ClaudeSettingsStatus {
  if (!existsSync(abs)) {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ attribution: { commit: CLAUDE_TRAILER } }, null, 2) + "\n");
    return "created";
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf8"));
  } catch {
    return "malformed";
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "malformed";
  const settings = raw as Record<string, unknown>;
  const attribution = settings.attribution;
  // the team already decided: attribution off, or a commit line of their own (even an empty one)
  if (attribution === false || (attribution && typeof attribution === "object" && "commit" in attribution)) return "kept";
  if (attribution === undefined && settings.includeCoAuthoredBy === false) return "kept";
  const next = { ...settings, attribution: { ...(attribution && typeof attribution === "object" ? attribution : {}), commit: CLAUDE_TRAILER } };
  writeFileSync(abs, JSON.stringify(next, null, 2) + "\n");
  return "merged";
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
  // Claude Code: the rule in every CLAUDE.md, and the trailer setting beside each place it's used.
  const claudeDirs = claudeCodeDirs(root);
  if (opts.claudeCode && !claudeDirs.includes("")) claudeDirs.unshift("");
  const claudeSettings: InitResult["claudeSettings"] = [];
  for (const dir of claudeDirs) {
    const rel = (f: string) => (dir ? `${dir}/${f}` : f);
    if (dir) ensureAco(join(root, dir, "CLAUDE.md"), rel("CLAUDE.md"), res, { createIfAbsent: false, ...aco });
    const file = rel(".claude/settings.json");
    const status = ensureClaudeSettings(join(root, file));
    if (status === "created") created.push(file);
    claudeSettings.push({ file, status });
  }
  if (host === "github") {
    writeIfAbsent(join(root, ".github", "workflows", "disclosure.yml"), ".github/workflows/disclosure.yml", GH_WORKFLOW, created, skipped);
  } else if (host === "azure-devops") {
    writeIfAbsent(join(root, ".madeby", "azure-pipelines.yml"), ".madeby/azure-pipelines.yml", AZURE_PIPELINE, created, skipped);
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
    nextSteps.push(`An AGENTS.md ACO convention was added — agents that read it disclose authorship (e.g. 'npx ${PKG} ai [tool]'), with madeby pinned to this release. Tune it to your repo's tools.`);
  }
  if (merged.length > 0) {
    nextSteps.push(`Merged the ACO disclosure rule into your existing ${merged.join(" + ")} — review the appended "Authorship disclosure (ACO)" section and tune it to your repo.`);
  }
  if (updated.length > 0) {
    nextSteps.push(`Refreshed an outdated ACO convention in ${updated.join(" + ")} to the current version — review the change before committing.`);
  }
  if (outdated.length > 0) {
    nextSteps.push(`${outdated.join(" + ")} carries an OUTDATED ACO convention (an older convention or an older pinned madeby) — run 'npx madeby@latest init --update' to refresh it in place (only the ACO block changes).`);
  }
  if (host === "azure-devops") {
    nextSteps.push("In Azure DevOps, create a pipeline from .madeby/azure-pipelines.yml (a PR-only pipeline: no credentials kept, madeby pinned) and add it to the protected branch as a build-validation policy.");
  } else if (host !== "github") {
    nextSteps.push(`Add a CI step that runs 'npx madeby check' on pull requests for ${host}.`);
  }
  if (policy.mode !== "required") {
    nextSteps.push('When ready to enforce: run \'madeby init --required\' (or set "mode": "required" in .madeby/policy.json), then make the check required on the protected branch — the host\'s control plane (GitHub: gh api branch protection; Azure: a build-validation policy). See the MCP resource madeby://guide/enforce for exact commands.');
  }
  nextSteps.push("Contributors disclose origin with a Co-Authored-By / Generated-by trailer (AI), an Authored-by-human trailer ('madeby me'), or an Authored-by-ai trailer ('madeby ai' — AI authored, committer accountable). A DCO Signed-off-by or a signed commit alone doesn't say who wrote the code, so it counts only if the policy's 'accept' lists it. Evidence upgrade: 'madeby ai --witness' records your own AI session's witnessed spans.");
  const set = claudeSettings.filter((c) => c.status === "created" || c.status === "merged").map((c) => c.file);
  const kept = claudeSettings.filter((c) => c.status === "kept").map((c) => c.file);
  const broken = claudeSettings.filter((c) => c.status === "malformed").map((c) => c.file);
  if (claudeSettings.length === 0) {
    nextSteps.push("No Claude Code files found (a CLAUDE.md or .claude/ folder, at any depth), so Claude Code's commit trailer wasn't set. If developers use Claude Code here, run 'madeby init --claude-code'.");
  }
  if (set.length > 0) {
    nextSteps.push(`Claude Code now adds '${CLAUDE_TRAILER}' to its commits when launched where ${set.join(", ")} applies, for everyone — including developers who turned the trailer off in their personal settings. Their .claude/settings.local.json, or an instruction of their own, can still turn it off; the check is what holds the line.`);
  }
  if (kept.length > 0) {
    nextSteps.push(`${kept.join(", ")} already set${kept.length === 1 ? "s" : ""} Claude Code's commit attribution, so it was left as the team set it. Clear that setting for the default trailer, or set attribution.commit to name the AI.`);
  }
  if (broken.length > 0) {
    nextSteps.push(`${broken.join(", ")} isn't valid JSON, so Claude Code's commit trailer wasn't set there. Fix it and run 'madeby init' again.`);
  }
  nextSteps.push(`Each developer, once in their own clone: 'npx ${PKG} me --merges' (add --with-ai <tool> if they resolve conflicts with AI, or use 'ai <tool> --merges'). Merges they finish locally then carry their disclosure; hooks aren't part of the repo, so this can't be done for them. The AGENTS.md rule has their agents suggest it.`);
  nextSteps.push("Existing history is accounted for honestly, not fabricated: run 'madeby check' over full history to recognize what's already disclosed; pre-adoption commits stay unknown. See madeby://guide/backfill.");

  return { created, skipped, merged, updated, outdated, raised, modelOn, policyMode: policy.mode, recordModel: policy.recordModel, claudeSettings, host, nextSteps };
}

// The GitHub Actions workflow (mirrors the quickstart; pinned action tag; fetch-depth:0 so the gate
// can auto-scope to the PR's own commits). madeby is pinned to the release that wrote it, and the job
// can only read: a check needs no token, so none is kept for the code it runs.
const GH_WORKFLOW = `name: Disclosure
on: pull_request
permissions:
  contents: read
jobs:
  madeby:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: MadeByFYI/MadeBy/packages/action@v0.2.0
        with:
          version: "${VERSION}"
`;

// The Azure Pipelines equivalent: a PR-only pipeline, run as a build-validation policy. Full history
// (the range needs the target branch), no credentials kept, madeby pinned. The check reads git only.
const AZURE_PIPELINE = `# MadeBy disclosure check. Run it as a build-validation policy on the protected branch: Azure
# DevOps runs it for each pull request. It reads the git history only, so it keeps no credentials.
trigger: none

pool:
  vmImage: ubuntu-latest

steps:
  - checkout: self
    fetchDepth: 0 # the PR's commits and the target branch, so the range can be read
    persistCredentials: false
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: npx --yes madeby@${VERSION} check
    displayName: MadeBy disclosure check
`;
