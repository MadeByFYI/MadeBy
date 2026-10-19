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

/** The delimited, versioned ACO block — the unit init inserts and `--update` replaces. */
const ACO_BLOCK = `${ACO_OPEN}\n${ACO_BODY}${ACO_CLOSE}\n`;
// A fresh AGENTS.md: minimal header + the ACO block (so the whole convention is the updatable block).
const AGENTS_CONVENTION = `# AGENTS.md\n\n${ACO_BLOCK}`;
// Appended into an existing agent file (leading blank line separates it from prior content).
const ACO_SECTION = `\n${ACO_BLOCK}`;

export interface InitOptions {
  /** policy mode to seed (default "advisory" — reports, never fails) */
  mode?: "advisory" | "required";
  /** CI host to wire (default "github"; "azure-devops" is guided; others get a generic next-step) */
  host?: string;
  /** refresh an outdated ACO convention block in place (drift update) rather than just report it */
  update?: boolean;
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
  /** the mode the repo's policy file actually carries after init (not merely the mode requested) */
  policyMode: string;
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

/** Replace the located ACO block with the current one, preserving everything else. */
function replaceAcoBlock(content: string, loc: AcoBlockLoc): string {
  return content.slice(0, loc.start) + ACO_BLOCK + content.slice(loc.end);
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
function ensurePolicy(
  abs: string,
  rel: string,
  mode: "advisory" | "required",
  res: Pick<InitResult, "created" | "skipped" | "raised">,
): { mode: string; malformed: boolean } {
  if (!existsSync(abs)) {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ version: 0, mode }, null, 2) + "\n");
    res.created.push(rel);
    return { mode, malformed: false };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(abs, "utf8"));
  } catch {
    res.skipped.push(rel);
    return { mode: "advisory", malformed: true };
  }
  const isObject = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const current = parseDisclosurePolicy(raw).mode;
  if (mode === "required" && current !== "required" && isObject) {
    writeFileSync(abs, JSON.stringify({ ...(raw as Record<string, unknown>), mode: "required" }, null, 2) + "\n");
    res.raised.push(rel);
    return { mode: "required", malformed: false };
  }
  res.skipped.push(rel);
  return { mode: current, malformed: !isObject };
}

// Ensure an agent file carries a current ACO rule. Absent file + createIfAbsent ⇒ write the full
// convention (created). No ACO block yet ⇒ append the section (merged). Outdated block ⇒ refresh it in
// place when `update`, else flag it (outdated). Current/newer ⇒ leave it (skipped).
function ensureAco(
  abs: string,
  rel: string,
  res: Pick<InitResult, "created" | "skipped" | "merged" | "updated" | "outdated">,
  opts: { createIfAbsent: boolean; update: boolean },
): void {
  if (!existsSync(abs)) {
    if (!opts.createIfAbsent) return;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, AGENTS_CONVENTION);
    res.created.push(rel);
    return;
  }
  const content = readFileSync(abs, "utf8");
  const status = acoStatus(content);
  if (status === "absent") {
    const sep = content.endsWith("\n") ? "" : "\n";
    writeFileSync(abs, content + sep + ACO_SECTION);
    res.merged.push(rel);
  } else if (status === "outdated") {
    if (opts.update) {
      writeFileSync(abs, replaceAcoBlock(content, findAcoBlock(content)!));
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
  const res = { created, skipped, merged, updated, outdated, raised };

  const policy = ensurePolicy(join(root, ".madeby", "policy.json"), ".madeby/policy.json", mode, res);
  // AGENTS.md — the cross-tool convention: create it, merge the rule in, or refresh a drifted block.
  ensureAco(join(root, "AGENTS.md"), "AGENTS.md", res, { createIfAbsent: true, update });
  // CLAUDE.md — Claude Code reads this preferentially; merge/refresh if the repo has one (never create).
  ensureAco(join(root, "CLAUDE.md"), "CLAUDE.md", res, { createIfAbsent: false, update });
  if (host === "github") {
    writeIfAbsent(join(root, ".github", "workflows", "disclosure.yml"), ".github/workflows/disclosure.yml", GH_WORKFLOW, created, skipped);
  }

  const nextSteps: string[] = ["Commit the created files."];
  if (raised.length > 0) {
    nextSteps.push('Raised .madeby/policy.json to "required" — undisclosed commits now fail the check. To make it block merges, also mark the check required on the protected branch (see madeby://guide/enforce).');
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

  return { created, skipped, merged, updated, outdated, raised, policyMode: policy.mode, host, nextSteps };
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
