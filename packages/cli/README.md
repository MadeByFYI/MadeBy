# madeby

**Verifiable content provenance — disclosure, not detection.**

`madeby` recognizes what a commit *discloses* about its origin, and lets a project gate PRs on that
disclosure. It never tries to guess whether code is AI — no tool can do that honestly, and
false-accusing a contributor is worse than the problem. It reports what contributors **put on the
record**; what a project *requires* is the maintainer's policy, set in a file in the repo.

Zero hosted infrastructure. It runs entirely against your local git history — on a laptop or in any
CI. Nothing leaves your machine.

## Install

```sh
npx madeby check        # no install needed
# or
npm i -g madeby
```

## Usage

```
madeby check     [<range>]     Evaluate commits against .madeby/policy.json (the disclosure gate).
                               <range> e.g. origin/main..HEAD — a PR's own commits. --json for output.
madeby recognize [<range>]     The raw disclosure primitive: per-commit disclosure kinds, no policy.
                               --json for structured output. Compose it into your own gate/view.
madeby prove     [<log>] [<ref>]  Capture your AI session log's witnessed spans into .madeby/spans.
madeby mcp                     Run the MCP server (stdio) — the primitives as agent-callable tools.
madeby help
```

### `madeby check` — the disclosure gate

Reads `.madeby/policy.json`, recognizes each commit's disclosure signals, and reports coverage.
A commit **discloses its origin** if it carries any of:

- an **AI-authorship trailer** — `Co-Authored-By:` / `Generated-by:` / `Assisted-by:` naming an AI
  tool (Claude Code, Copilot, Cursor, aider, … already emit these);
- a **DCO `Signed-off-by:`** line;
- a **commit signature**;
- a **`madeby prove`** attestation.

Exit codes: **0** = pass · **1** = a `required` policy failed on an undisclosed commit · **2** = not
a git repository. Under `advisory`/`off` it only reports (always exit 0) — so it's safe to add to CI
before you decide to enforce anything.

In CI, omit `<range>` — on a pull-request build `madeby check` **auto-scopes to the PR's own
commits** from the CI environment (GitHub today; other hosts via their adapter). Pass an explicit
`<range>` to override.

```json
// .madeby/policy.json
{ "version": 0, "mode": "advisory" }
```

- `advisory` — report coverage on each run; never fails.
- `required` — fail on any commit that discloses nothing your policy accepts.
- `off` — no gate.
- optional `"accept": ["dco-signoff", "ai-trailer", …]` — restrict what satisfies the policy
  (omit ⇒ any recognized disclosure counts).

Fail-safe by design: a missing or malformed policy degrades to `off`. `madeby` never blocks a PR on
its own error, and never invents a stricter gate than the maintainer wrote.

## Use it as a PR check

A ready-made GitHub Action and an Azure DevOps Pipelines template wrap `madeby check` — nothing
hosted, nothing leaves your CI. See
[`packages/action`](https://github.com/MacDougherty/MadeBy/tree/main/packages/action#readme).

## Extend it anywhere — primitives you run, not code you ship

MadeBy is composable primitives, not a plugin host. To support a **new CI host, a custom gate, or
your own dashboard**, you don't register code with us — you run the primitives **in your own
environment**:

- **`madeby recognize --json`** — the raw recognizer: per-commit disclosure kinds, no policy. Build
  any view or gate on top.
- **`madeby check --json`** — the gate's structured result (`pass`, `mode`, `undisclosed[]`); the
  exit code still gates, so CI can use either.
- The same logic as a library: [`@madeby/core`](https://www.npmjs.com/package/@madeby/core)
  (`commitDisclosureKinds`, `evaluateDisclosurePolicy`).

**A new host needs no adapter from us** — compute the range however that host exposes it and pass it.
GitLab CI, for example, ships nothing to MadeBy:

```yaml
disclosure:
  image: node:20
  rules: [{ if: '$CI_PIPELINE_SOURCE == "merge_request_event"' }]
  script:
    - npx --yes madeby check "$CI_MERGE_REQUEST_DIFF_BASE_SHA..$CI_COMMIT_SHA"
```

We ship built-in adapters (GitHub, Azure DevOps) so those hosts are turnkey — but they're a
convenience, not the extension path. Whatever you compose can only report what the primitives permit,
so the trust guarantees hold no matter who runs them.

## Agent-native — the MCP server

`madeby mcp` runs a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio, so
an AI agent can use MadeBy with no human in the loop. It exposes the same primitives as typed tools:

- **`recognize`** `{ path?, range? }` — per-commit disclosure kinds (no policy).
- **`check`** `{ path?, range? }` — the gate result (`pass`, `mode`, `undisclosed[]`).
- **`list_host_adapters`** — the known forges and each one's capabilities.
- **`resolve_identity`** `{ name?, email?, host? }` — a committer's stable key + public handle.

Point an MCP client at the command (e.g. a `claude_desktop_config.json` / `.mcp.json` entry):

```json
{ "mcpServers": { "madeby": { "command": "npx", "args": ["-y", "madeby", "mcp"] } } }
```

Dependency-free and self-contained: stdout carries only protocol messages, an unreadable repo or bad
input comes back as a tool error (the agent sees it, never a crash), and — like every surface — the
tools can only report what the primitives permit.

## Honest scope

Disclosure and accountability, **not** an AI slop-blocker or detector. A `required` gate deters
low-effort drive-bys (as the DCO does) and gives a basis to triage — it does not, and will never,
claim to detect AI.

MIT · part of [MadeBy](https://github.com/MacDougherty/MadeBy)
