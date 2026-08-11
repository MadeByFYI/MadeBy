// `initRepo` — align a repository with MadeBy in one call: write `.madeby/policy.json` (advisory by
// default) and the CI disclosure check for the host. Shared by the `madeby init` command and the MCP
// `init` tool, so a human or an agent onboards a repo identically. Idempotent by construction: it
// never clobbers an existing policy or workflow (reports them as skipped), so re-running is safe.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface InitOptions {
  /** policy mode to seed (default "advisory" — reports, never fails) */
  mode?: "off" | "advisory" | "required";
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
      - uses: MacDougherty/MadeBy/packages/action@v0.1.0
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
  if (host === "github") {
    writeIfAbsent(join(root, ".github", "workflows", "disclosure.yml"), ".github/workflows/disclosure.yml", GH_WORKFLOW, created, skipped);
  }

  const nextSteps: string[] = ["Commit the created files."];
  if (host === "azure-devops") {
    nextSteps.push("Add the Azure Pipelines template (packages/action/azure-pipelines-disclosure.yml) and wire it as a PR build-validation branch policy.");
  } else if (host !== "github") {
    nextSteps.push(`Add a CI step that runs 'npx madeby check' on pull requests for ${host}.`);
  }
  if (mode !== "required") {
    nextSteps.push('When ready to enforce, set .madeby/policy.json mode to "required" and add the check to the branch protection / build-validation rule.');
  }
  nextSteps.push("Contributors disclose origin with a Co-Authored-By / Generated-by trailer, a DCO Signed-off-by, a signed commit, or 'madeby prove'.");
  nextSteps.push("Historical commits are NOT backfilled — disclosure applies going forward.");

  return { created, skipped, policyMode: mode, host, nextSteps };
}
