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
- an **affirmative human-authorship trailer** — `Authored-by-human: <you>` (see below);
- a **DCO `Signed-off-by:`** line;
- a **commit signature**;
- a **`madeby prove`** attestation.

Exit codes: **0** = pass · **1** = a `required` policy failed on an undisclosed commit · **2** = not
a git repository. Under `advisory`/`off` it only reports (always exit 0) — so it's safe to add to CI
before you decide to enforce anything.

In CI, omit `<range>` — on a pull-request build `madeby check` **auto-scopes to the PR's own
commits** from the CI environment (GitHub today; other hosts via their adapter). Pass an explicit
`<range>` to override.

### Affirm human authorship

Disclosure runs both ways: if you wrote code yourself, affirm it so your work is *disclosed-human*,
not lumped into unknown. It's just a commit trailer — the "tool" is git. Make it a keystroke with an
alias:

```sh
git config alias.affirm '!git commit --trailer "Authored-by-human: $(git config user.name) <$(git config user.email)>"'
git affirm -m "hand-written parser"     # discloses human authorship
```

Human and AI disclosure ride the **same ladder** — a trailer is *asserted*; sign the commit and it's
*verified* (the signature authenticates *who* affirmed it, not the human-vs-AI content — equally true
of AI disclosure); a sworn declaration is *sworn*. The one asymmetry is evidence, not tier: AI can
leave a re-checkable artifact (a session log, `prove`); human authorship is your firsthand testimony.
If you used AI, disclose the AI — don't claim human.

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

A ready-made GitHub Action, an Azure DevOps Pipelines template, and a GitLab CI job wrap
`madeby check` — nothing hosted, nothing leaves your CI. See
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
Any CI without a built-in adapter ships nothing to MadeBy; e.g. a Jenkins pipeline:

```groovy
sh 'npx --yes madeby check "origin/${CHANGE_TARGET}...HEAD"'
```

We ship built-in adapters (GitHub, Azure DevOps, GitLab) so those hosts are turnkey — the CI env
auto-scopes the range with no arguments — but they're a *convenience, not the extension path*.
Whatever you compose can only report what the primitives permit, so the trust guarantees hold no
matter who runs them.

## Agent-native — the MCP server

`madeby mcp` runs a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio, so
an AI agent can use MadeBy with no human in the loop. It exposes the same primitives as typed tools:

- **`init`** `{ path?, mode?, host? }` — align a repo: create `.madeby/policy.json` + the CI check
  (idempotent). The one-call setup. *write*
- **`recognize`** `{ path?, range? }` — per-commit disclosure kinds (no policy). *read*
- **`check`** `{ path?, range? }` — the gate result (`pass`, `mode`, `undisclosed[]`). *read*
- **`prove`** `{ path?, log?, ref? }` — record witnessed AI spans from the agent's own session log
  into `.madeby/spans` (asserted tier, local; only spans structurally present are kept). *write*
- **`provenance`** `{ path, startLine?, endLine? }` — what's *on the record* about a file's origin:
  witnessed AI spans (model/tool) where captured, last-touch commit disclosure elsewhere, unknown
  otherwise. The read for **provenance-as-context**. The line range is the contract — for
  function/symbol resolution, turn a symbol into a range with your own tooling (tree-sitter/LSP);
  MadeBy never parses code. *read*
- **`provenance_map`** `{ prefix?, commitLimit? }` — the repo-wide orientation an agent reads *before*
  it works: the witnessed AI surface (files/regions, model-named) + commit-level disclosure coverage.
  Files without a witnessed span are unknown-origin. *read*
- **`list_host_adapters`** — the known forges and each one's capabilities. *read*
- **`resolve_identity`** `{ name?, email?, host? }` — a committer's stable key + public handle. *read*

The server is also **self-teaching** via MCP resources, so an agent can discover *how* to align a
repo, not just which verbs exist:

- **`madeby://guide/align`** — the step-by-step alignment workflow.
- **`madeby://guide/enforce`** — the exact commands to make the check *required* on a protected branch
  (GitHub / Azure) — the host's control plane, so MadeBy doesn't do it for you, but it's not left to
  the reader either.
- **`madeby://guide/backfill`** — how to account for pre-adoption history *honestly*: recognize
  what's already disclosed, attach recoverable evidence, set an adoption boundary; unknown stays
  unknown, never fabricated.
- **`madeby://schema/policy`** — the `.madeby/policy.json` schema.

So "align my repo with MadeBy" is fully agent-serviceable: the agent reads the guide, calls **`init`**
to write the policy + CI check, records its own AI work with **`prove`**, and verifies with
**`check`** — no human in the loop. (Two things stay outside the tools, by design: turning on branch
protection is the *host's* setting, and historical commits are never backfilled — disclosure is
going-forward. `prove` cannot claim a higher tier or attribute to anyone else, and nothing leaves the
machine.)

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
