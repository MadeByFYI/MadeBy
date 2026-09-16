// `initRepo` — align a repository with MadeBy in one call: write `.madeby/policy.json` (advisory by
// default) and the CI disclosure check for the host. Shared by the `madeby init` command and the MCP
// `init` tool, so a human or an agent onboards a repo identically. Idempotent by construction: it
// never clobbers an existing policy or workflow (reports them as skipped), so re-running is safe.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface InitOptions {
  /** policy mode to seed (default "advisory" — reports, never fails) */
  mode?: "advisory" | "required";
  /** CI host to wire (default "github"; "azure-devops" is guided; others get a generic next-step) */
  host?: string;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  policyMode: string;
  host: string;
  nextSteps: string[];
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

// The ACO agent convention (the initiation lever): dropped into the repo so any agent working here
// discloses authorship per ACO unprompted. Absolute links — this lands in someone else's repo. The
// fuller reference is this project's own AGENTS.md.
const AGENTS_CONVENTION = `# AGENTS.md — Authorship disclosure convention (ACO)

This repository asks any AI agent — or a human working with one — to **disclose who authored the
changes they make**, per **ACO, the Authorship Certificate of Origin**
(https://github.com/MadeByFYI/MadeBy/blob/main/ACO.md).

## The rule

When you author or modify content here, disclose the authorship **category** on your commit — one of:

- \`human\` — a human authored it, no AI involvement.
- \`with_ai\` — a human authored it with disclosed AI assistance.
- \`ai\` — an AI agent authored it (a human remains accountable).

Disclose **per commit, honestly** — the category describes what actually happened for that change.

## The one-line way (asserted tier — no keys, no setup)

After you commit, run the matching command (works with no install via \`npx\`):

| Category  | Command                          |
|-----------|----------------------------------|
| \`human\`   | \`npx madeby@latest me\`                  |
| \`with_ai\` | \`npx madeby@latest me --with-ai <tool>\` |
| \`ai\`      | \`npx madeby@latest ai [tool]\`           |

Undisclosed content stays *unknown*, never guessed. See ACO for the standard.
`;

function writeIfAbsent(abs: string, rel: string, content: string, created: string[], skipped: string[]): void {
  if (existsSync(abs)) {
    skipped.push(rel);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  created.push(rel);
}

export function initRepo(root: string, opts: InitOptions = {}): InitResult {
  const mode = opts.mode ?? "advisory";
  const host = opts.host ?? "github";
  const created: string[] = [];
  const skipped: string[] = [];

  writeIfAbsent(join(root, ".madeby", "policy.json"), ".madeby/policy.json", JSON.stringify({ version: 0, mode }, null, 2) + "\n", created, skipped);
  writeIfAbsent(join(root, "AGENTS.md"), "AGENTS.md", AGENTS_CONVENTION, created, skipped);
  if (host === "github") {
    writeIfAbsent(join(root, ".github", "workflows", "disclosure.yml"), ".github/workflows/disclosure.yml", GH_WORKFLOW, created, skipped);
  }

  const nextSteps: string[] = ["Commit the created files."];
  if (created.includes("AGENTS.md")) {
    nextSteps.push("An AGENTS.md ACO convention was added — agents that read it disclose authorship (e.g. 'npx madeby@latest me --with-ai <tool>'). Tune it to your repo's tools.");
  } else if (skipped.includes("AGENTS.md")) {
    nextSteps.push("You already have an AGENTS.md — add the ACO disclosure rule to it (reference: https://github.com/MadeByFYI/MadeBy/blob/main/AGENTS.md).");
  }
  if (host === "azure-devops") {
    nextSteps.push("Add the Azure Pipelines template (packages/action/azure-pipelines-disclosure.yml) and wire it as a PR build-validation branch policy.");
  } else if (host !== "github") {
    nextSteps.push(`Add a CI step that runs 'npx madeby check' on pull requests for ${host}.`);
  }
  if (mode !== "required") {
    nextSteps.push('When ready to enforce: set mode to "required", then make the check required on the protected branch — the host\'s control plane (GitHub: gh api branch protection; Azure: a build-validation policy). See the MCP resource madeby://guide/enforce for exact commands.');
  }
  nextSteps.push("Contributors disclose origin with a Co-Authored-By / Generated-by trailer (AI), an Authored-by-human trailer ('madeby me'), an Authored-by-ai trailer ('madeby ai' — AI authored, committer accountable), a DCO Signed-off-by, or a signed commit. Evidence upgrade: 'madeby ai --witness' records your own AI session's witnessed spans.");
  nextSteps.push("Existing history is accounted for honestly, not fabricated: run 'madeby check' over full history to recognize what's already disclosed; pre-adoption commits stay unknown. See madeby://guide/backfill.");

  return { created, skipped, policyMode: mode, host, nextSteps };
}
