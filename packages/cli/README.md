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
madeby init                    Set MadeBy up: write .madeby/policy.json + the CI disclosure check.
madeby check  [<range>]        The gate: do commits meet .madeby/policy.json? (a verdict — exit code
                               gates). <range> e.g. origin/main..HEAD — a PR's own commits. --json too.
madeby who    [<path>]         Made by whom? What's on the record about who made this — one file's
  (alias: whom)                origin, or the whole repo with no path. --lines=A-B to scope. --json too.
madeby ai     [<log>] [<ref>]  Made by AI: record your AI session's witnessed spans into .madeby/spans.
madeby me                      Made by me: affirm you authored HEAD yourself (an Authored-by-human trailer).
madeby mcp                     Run the MCP server (stdio) — the tools, agent-callable.
madeby help
```

The surface is your product thesis — **"made by ___"**: `who` reads it, `ai` and `me` write the two
sides of it, and `init`/`check` are the setup and the gate.

### `madeby check` — the disclosure gate

Reads `.madeby/policy.json`, recognizes each commit's disclosure signals, and reports coverage.
A commit **discloses its origin** if it carries any of:

- an **AI-authorship trailer** — `Co-Authored-By:` / `Generated-by:` / `Assisted-by:` naming an AI
  tool (Claude Code, Copilot, Cursor, aider, … already emit these);
- an **affirmative human-authorship trailer** — `Authored-by-human: <you>` (see below);
- a **DCO `Signed-off-by:`** line;
- a **commit signature**;
- a **`madeby ai`** attestation (your own AI session's witnessed spans).

Exit codes: **0** = pass · **1** = a `required` policy failed on an undisclosed commit · **2** = not
a git repository. Under `advisory` it only reports (always exit 0) — so it's safe to add to CI
before you decide to enforce anything.

In CI, omit `<range>` — on a pull-request build `madeby check` **auto-scopes to the PR's own
commits** from the CI environment (GitHub today; other hosts via their adapter). Pass an explicit
`<range>` to override.

### `madeby me` — affirm human authorship

Disclosure runs both ways: if you wrote code yourself, affirm it so your work is *disclosed-human*,
not lumped into unknown. `madeby me` adds an `Authored-by-human` trailer to your last commit — the
symmetric human claim to `madeby ai`. (The "tool" underneath is just git; if you prefer it at commit
time, `git commit --trailer "Authored-by-human: …"` does the same thing.)

```sh
madeby me     # affirms human authorship of HEAD
```

Human and AI disclosure ride the **same ladder** — a trailer is *asserted*; sign the commit and it's
*verified* (the signature authenticates *who* affirmed it, not the human-vs-AI content — equally true
of AI disclosure); a sworn declaration is *sworn*. The one asymmetry is evidence, not tier: AI can
leave a re-checkable artifact (a session log, `madeby ai`); human authorship is your firsthand
testimony. If you used AI, disclose the AI — don't claim human.

**The policy file is optional.** With no `.madeby/policy.json`, `check` defaults to **advisory** —
it reports coverage and never blocks, so you can run it (or add the CI check) with zero config. Add
the file only when you want to enforce:

```json
// .madeby/policy.json
{ "version": 0, "mode": "required" }
```

Two modes, nothing more:

- `advisory` — report coverage on each run; never fails. **The default** (and what you get with no file).
- `required` — fail on any commit that discloses nothing your policy accepts.
- optional `"accept": ["dco-signoff", "ai-trailer", …]` — restrict what satisfies the policy
  (omit ⇒ any recognized disclosure counts).

(There's no "off" — that's just not running the check. Advisory is the floor.)

Fail-safe by design: a missing or malformed policy degrades to `advisory`. `madeby` never blocks a PR
on its own error, and never invents a stricter gate than the maintainer wrote.

## Use it as a PR check

A ready-made GitHub Action, an Azure DevOps Pipelines template, and a GitLab CI job wrap
`madeby check` — nothing hosted, nothing leaves your CI. See
[`packages/action`](https://github.com/MacDougherty/MadeBy/tree/main/packages/action#readme).

## Extend it anywhere — primitives you run, not code you ship

MadeBy is composable primitives, not a plugin host. To support a **new CI host, a custom gate, or
your own dashboard**, you don't register code with us — you run the primitives **in your own
environment**:

- **`madeby check --json`** — the gate's structured result (`pass`, `mode`, `undisclosed[]`); the
  exit code still gates, so CI can use either.
- The raw recognizer as a library: [`@madeby/core`](https://www.npmjs.com/package/@madeby/core)
  (`commitDisclosureKinds`, `evaluateDisclosurePolicy`) — per-commit disclosure kinds, no policy.
  Build any view or gate on top, in your own runtime.

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

- **`init`** `{ path?, mode?, host? }` — set a repo up: create `.madeby/policy.json` + the CI check
  (idempotent). The one-call setup. *write*
- **`check`** `{ path?, range? }` — the gate: do commits meet the policy? Returns `pass`, `mode`,
  `undisclosed[]`. *read (verdict)*
- **`who`** `{ path?, repo?, startLine?, endLine?, prefix?, commitLimit? }` — made by whom? With a
  `path`: what's *on the record* about that file's origin — witnessed AI spans (model/tool) where
  captured, last-touch commit disclosure elsewhere, unknown otherwise. With no `path`: the repo-wide
  map an agent reads *before* it works (the witnessed AI surface + commit-level coverage; cheap). The
  line range is the contract — for a symbol, turn it into a range with your own tooling
  (tree-sitter/LSP); MadeBy never parses code. *read (attribution)*
- **`ai`** `{ path?, log?, ref? }` — made by AI: record witnessed AI spans from the agent's own
  session log into `.madeby/spans` (asserted tier, local; only spans structurally present are kept).
  *write*

(`me` — affirming *human* authorship — is a CLI command, not an agent tool: an agent is AI, so it
discloses with `ai`, never `me`.)

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
to write the policy + CI check, records its own AI work with **`ai`**, and verifies with **`check`** —
no human in the loop. (Two things stay outside the tools, by design: turning on branch protection is
the *host's* setting, and historical commits are never backfilled — disclosure is going-forward.
`ai` cannot claim a higher tier or attribute to anyone else, and nothing leaves the machine.)

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
