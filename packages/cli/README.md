# madeby

**Disclose AI authorship of code. Disclosure, not detection.**

If you are an **AI coding agent** (Claude Code, Copilot, Cursor, Codex, …) and you authored or modified
code, disclose it in one command after you commit:

```sh
npx madeby ai            # adds an `Authored-by-ai:` trailer to HEAD — you (the committer) stay accountable
```

That's the honest **`ai`** disclosure (asserted tier, no session log needed). The three authorship
categories of the open **ACO standard** (Authorship Certificate of Origin):

| Category  | Command                          | What it records                        |
|-----------|----------------------------------|----------------------------------------|
| `ai`      | `npx madeby ai [tool]`           | `Authored-by-ai:` — an AI authored it  |
| `with_ai` | `npx madeby me --with-ai [tool]` | `Authored-by-human:` + `Assisted-by:`  |
| `human`   | `npx madeby me`                  | `Authored-by-human:`                   |

A repo invites this with an [`AGENTS.md`](https://github.com/MadeByFYI/MadeBy/blob/main/AGENTS.md)
convention (drop one in with `npx madeby init`); agents that read it disclose unprompted — in a
[reproducible experiment](https://github.com/MadeByFYI/MadeBy/tree/main/experiments/aco-adoption), three
AI coding agents did so in **12 of 12 trials, 0 of 14 without the convention.** `madeby` also
**recognizes disclosure already in the wild** — `Co-Authored-By:` / `Assisted-by:` trailers, DCO
sign-offs, SPDX AI-disclosure tags — and lets a project **gate PRs** on it (`madeby check`). It never
guesses whether code is AI; no tool can do that honestly. It reports only what contributors **put on
the record**.

The commands `init` writes into `AGENTS.md` pin the exact madeby release (`npx madeby@0.3.16 …`),
like the CI file does: agents run them on developers' machines, which hold credentials, so they run
the release the team chose rather than whatever is newest. When a newer release is out, `init`
reports the rule as outdated, and `npx madeby@latest init --update` moves the pin in one commit to
review.

Zero hosted infrastructure — runs against your local git history, on a laptop or in any CI. Nothing
leaves your machine.

## Install

```sh
npx madeby@latest ai     # no install needed
# or
npm i -g madeby
```

## Usage

```
madeby init                    Set MadeBy up: write .madeby/policy.json + the CI disclosure check.
                               --record-model (opt-in) also asks agents to name the model version.
                               In a repo that uses Claude Code, also turns its commit trailer on.
madeby check  [<range>]        The gate: do commits meet .madeby/policy.json? (a verdict — exit code
                               gates). <range> e.g. origin/main..HEAD — a PR's own commits. --json too.
madeby coverage [<range>]      The scoreboard: how much of the repo's authorship is disclosed (known)
                               vs unknown, the human/with_ai/ai mix, and the asserted/verified split.
madeby who    [<path>]         Made by whom? What's on the record about who made this — one file's
  (alias: whom)                origin, or the whole repo with no path. --lines=A-B to scope. --json too.
madeby ai     [tool]           Made by AI: attest AI authorship of HEAD (an Authored-by-ai trailer).
                               --model <version> names the model too (Authored-by-ai: <tool>:<version>).
                               `--witness [log]` instead records witnessed spans from a session log.
madeby me     [--with-ai [t]]  Made by me: affirm you authored HEAD (Authored-by-human); --with-ai adds
                               Assisted-by → with_ai. --model <version> names the model too.
              --print          (me / ai) print the trailer lines instead of amending HEAD — for a
                               platform that makes the commit itself (a cloud coding agent):
                               git commit -m "<msg>" -m "$(madeby ai <tool> --print)".
madeby mcp                     Run the MCP server (stdio) — the tools, agent-callable.
madeby help
```

The surface is your product thesis — **"made by ___"**: `who` reads it, `ai` and `me` write the two
sides of it, and `init`/`check` are the setup and the gate.

### `madeby check` — the disclosure gate

Reads `.madeby/policy.json`, recognizes each commit's disclosure signals, and reports coverage.
A commit **discloses who wrote it** if it carries any of:

- an **AI-authorship trailer** — `Co-Authored-By:` / `Generated-by:` / `Assisted-by:` naming an AI
  tool (Claude Code, Copilot, Cursor, aider, … already emit these), or `Authored-by-ai:`;
- an **affirmative human-authorship trailer** — `Authored-by-human: <you>` (see below);
- a **`madeby ai`** attestation (your own AI session's witnessed spans).

It checks the same commits `coverage` scores: every non-merge commit, plus any merge where someone
changed what git would have produced on its own (a conflict resolved by hand). A merge git made by
itself authors nothing and is never checked. Disclose a resolution like any commit: `madeby me
--with-ai <tool>` right after committing it, or `--for` later.

A **DCO `Signed-off-by:`** line or a **commit signature** is recognized too, but on its own it says
who is accountable for the commit, not who wrote it, so it counts only if the policy's `accept`
lists it. `check` reports commits that carry only one of those apart from those that carry nothing.

Exit codes: **0** = pass · **1** = a `required` policy failed on an undisclosed commit, or couldn't
read the history (below) · **2** = not a git repository. Under `advisory` it only reports (always exit 0) — so it's safe to add to CI
before you decide to enforce anything.

In CI, omit `<range>` — on a pull-request build `madeby check` **auto-scopes to the PR's own
commits** from the CI environment (GitHub, Azure DevOps and GitLab). Pass an explicit `<range>` to
override.

**The history has to be there.** On a shallow clone, when a range endpoint isn't in the clone (a
target branch that was never fetched), or on a pull-request build whose range can't be read, `check`
says so: under `required` it fails rather than score whatever happens to be present, and under
`advisory` it prints a warning. Check out the full history (`fetch-depth: 0` on GitHub,
`fetchDepth: 0` on Azure Pipelines); the files `madeby init` writes already do.

### `madeby coverage` — the authorship scoreboard

`check` is the gate; `coverage` is the picture. Run it in any repo to see how much of your
history's authorship is **on the record** — no policy, no config:

```sh
madeby coverage                 # scores recent history
madeby coverage origin/main..HEAD   # or a range
madeby coverage --by author     # the same, one row per commit author
```

```
authorship coverage — last 500 commits  (estimate · disclosure, not detection)
  known     62%  ████████████░░░░░░░░  disclosed — on the record
  unknown   38%  ███████░░░░░░░░░░░░░  no disclosure — origin unknown, never guessed

  of the 310 known:  human 41% · with_ai 38% · ai 21%
  trust:  asserted 88% · verified 12%  — self-reported; sign commits to verify

  agents & models named in the 183 AI commits:
    Claude Code        121   66%
    Claude Opus 5.5     98   54%
    Cursor              62   34%

  → 38% unknown. Require disclosure going forward:  madeby init --required
```

It is a **labeled estimate**, honest by construction: an undisclosed commit is **unknown**, never
inferred as human — disclosure, not detection. The human/with_ai/ai mix is reported *of the known*,
never of the whole repo, and the asserted-vs-verified split shows how much is signed. The agents and
model versions are listed exactly as the AI commits name them — a commit naming a tool and its model
(`Assisted-by: Claude Code` + `Co-Authored-By: Claude Opus 5.5`) counts under both, so those rows can
sum past 100%. `--by author` shows one row per commit author (grouped by email): how many of their
commits disclose, and the mix — who discloses and who never does. `--json` (which includes `byAuthor`) emits
counts only (percentages are derived at the edge, never stored). A merge git made on its own authors nothing
and isn't scored, even when both sides changed the same file; a merge where someone changed what git
would have produced (a conflict resolved by hand) is, like any other commit — chosen by what it
changes, never by whether it discloses. That takes git 2.36 or later (`--remerge-diff`); with older
git, merges git made cleanly may be counted too, and the scope says the count is approximate. Use it to see your gap, then
`madeby init --required` to close it going forward.

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

### Disclosing earlier commits — `--for`

`me` and `ai` amend HEAD. When that isn't possible — the commits are already pushed, or the repo
forbids amending and rebasing — disclose them with **one new commit** instead:

```sh
madeby me --with-ai "Claude Code" --for origin/dev..HEAD   # your commits on this branch
madeby ai "Claude Code" --for 4f1c2a9e                     # one commit
```

It makes an empty **disclosure commit** whose `Discloses: <hash>` lines name the commits and whose
trailers say who wrote them. Nothing is rewritten. Push it as usual: on a pull request the check
re-runs, and it travels with the branch into every target it's merged into. Only your own commits
(author email = `git config user.email`) that don't disclose yet are included; the rest are listed
as skipped. The model is named only if you pass `--model`, since the session you're in now didn't
write those commits. `check`, `coverage` and `who` read disclosure commits by the rules in
[ACO §5](https://github.com/MadeByFYI/MadeBy/blob/main/ACO.md#5-carriers-bindings--subsume-dont-compete), and `coverage` counts how many
disclosures arrived late.

### Merges that resolve conflicts — `--merges`

A merge where you fixed conflicts has changes of its own, so `check` scores it, and git's default
`Merge branch '…'` message says nothing about who wrote them. Say once how you resolve conflicts:

```sh
madeby me --merges                          # you resolve them yourself
madeby me --with-ai "Claude Code" --merges  # you, with AI
madeby ai "Claude Code" --merges            # the AI does
```

It saves that in this clone's git config (`madeby.merge`) and installs a small `prepare-commit-msg`
hook. From then on, a merge you finish in this clone carries the disclosure. The hook only writes
what you declared; it never guesses:

- Only merges with changes of their own. A clean merge isn't scored and is left alone.
- A message that already says who wrote it wins, such as Claude Code's own trailer.
- With no declaration, it offers commented-out lines when an editor opens, and adds nothing when
  none does.
- An existing `prepare-commit-msg` hook still runs first. If a hook manager owns your hooks folder
  (`core.hooksPath`, as with husky), madeby doesn't write into it and prints the line to add.

Hooks aren't part of the repo, so **each developer runs it once in their own clone**
(`madeby init --hooks` installs the hook without a declaration). Merges resolved in the host's web
UI don't run local hooks; disclose those with `--for`. `--merges off` clears the declaration.

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
- optional `"accept": ["dco-signoff", "ai-trailer", …]` — set what satisfies the policy
  (omit ⇒ any authorship disclosure counts; a DCO sign-off or signature alone counts only if listed).
- optional `"recordModel": true` — written by `madeby init --record-model`: the repo asks AI
  disclosures to name the model version as well as the tool. It adds one line to the AGENTS.md rule,
  and `me --with-ai` / `ai` then read the model from the **tool's own record of the session** — Cursor's
  `CURSOR_MODEL` or its chat store, the Copilot CLI and Claude Code session logs (locally; only the model id is read) —
  which wins over an agent's `--model`, since an agent routed by "Auto" may not know which model served
  it. Elsewhere `--model <version>` is used, never guessed. So `coverage` can list each **agent · model** pairing
  (`Cursor · gpt-5.3-codex` vs `Claude Code · claude-sonnet-5`). A request, not a gate — an AI
  disclosure without a model still satisfies the policy. Opt-in because naming models is a project's
  call: the Linux kernel, for one, asks only that an LLM was used, not which.

(There's no "off" — that's just not running the check. Advisory is the floor.)

Fail-safe by design: a missing or malformed policy degrades to `advisory`. `madeby` never blocks a PR
on its own error, and never invents a stricter gate than the maintainer wrote. It never passes a
`required` check it couldn't actually run, either: missing history fails it (see `check` above).

### Claude Code's own trailer

Claude Code adds a `Co-Authored-By` trailer to its commits unless a developer turns it off in their
personal settings — and then the `AGENTS.md` rule alone may not bring it back. So in a repo that uses
Claude Code (it has a `CLAUDE.md` or a `.claude/` folder; `--claude-code` to force), `madeby init`
sets the trailer in the shared `.claude/settings.json`. It looks at any depth: Claude Code reads the
settings of the folder it's launched from, so a monorepo whose app keeps its `CLAUDE.md` in
`application/` gets `application/.claude/settings.json`, and the disclosure rule merged into that
`CLAUDE.md`. If it finds none, it says so.

```json
{ "attribution": { "commit": "Co-Authored-By: Claude Code <noreply@anthropic.com>" } }
```

The shared project file overrides a developer's personal settings, so everyone in the repo gets the
trailer back. It's fixed text — Claude Code's setting has no placeholder for the model — so to record
the model use `--record-model`. It merges into an existing file and never changes a value the team
already set, including turning attribution off on purpose. A developer's own
`.claude/settings.local.json` or instructions can still turn it off; the `required` check is what
holds the line.

## Use it as a PR check

A ready-made GitHub Action, an Azure DevOps Pipelines template, and a GitLab CI job wrap
`madeby check` — nothing hosted, nothing leaves your CI. See
[`packages/action`](https://github.com/MadeByFYI/MadeBy/tree/main/packages/action#readme).

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
- **`disclose`** `{ path?, category?, tool? }` — made by ___: disclose authorship on HEAD per ACO.
  `category: "ai"` (an AI authored it; the committer is the accountable human) adds `Authored-by-ai`;
  `"with_ai"` adds `Authored-by-human` + `Assisted-by`; `"human"` adds `Authored-by-human`. The
  agent-native disclosure for the work you just did. *write*
- **`ai`** `{ path?, log?, ref? }` — the evidence upgrade for the `ai` category: record witnessed AI
  spans from the agent's own session log into `.madeby/spans` (asserted→verified, local; only spans
  structurally present are kept). *write*

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
to write the policy + CI check, discloses its own work with **`disclose`** (and optionally upgrades it to
witnessed spans with **`ai`**), and verifies with **`check`** —
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

MIT · part of [MadeBy](https://github.com/MadeByFYI/MadeBy)
