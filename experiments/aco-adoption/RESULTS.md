# Results — ACO adoption by AI coding agents

**Summary: three independent AI coding agents — Claude Code, GitHub Copilot, and Cursor — were each
given an ordinary coding task in a repository, with no mention of disclosure. When the repository carried
the [ACO](../../ACO.md) `AGENTS.md` convention, every agent disclosed its authorship honestly. When it did
not, none did. Combined: 12 of 12 trials disclosed with the convention present; 0 of 14 without.**

Run with the harness in this directory (see [README](./README.md)); methodology and caveats below.

## The data

| Agent | Surface | With convention (ACO-disclosed) | Control (ACO-disclosed) | Category |
|-------|---------|---------------------------------|-------------------------|----------|
| Claude Code (v2.1) | local CLI, headless | **6 / 6 (100%)** | **0 / 9 (0%)** | `ai` |
| GitHub Copilot | remote coding agent (PR) | **1 / 1 (100%)** | **0 / 1 (0%)** | `ai` |
| Cursor | local CLI (`cursor-agent`) | **5 / 5 (100%)** | **0 / 4 (0%)** | `ai` |
| **Total** | | **12 / 12 (100%)** | **0 / 14 (0%)** | |

Each "with convention" disclosure was a deliberate `Authored-by-ai: <tool>` trailer the agent added after
reading the repository's `AGENTS.md` — not prompted, and distinct from any ambient trailer the agent adds
by default (see "Controlling for ambient disclosure").

## Key findings

1. **Agents initiate disclosure unprompted when the convention is present.** Given only a coding task,
   each agent discovered the `AGENTS.md` ACO rule, correctly classified its own work as `ai` ("an AI
   authored this; the committing human is accountable"), and recorded the disclosure itself.

2. **The convention is what causes it.** With no convention in the repository, the ACO-specific disclosure
   rate was **0 of 14**. The difference between 12/12 and 0/14 is the convention.

3. **It generalizes across vendors and surfaces.** Three different agents, three different execution
   models (a local CLI, a remote PR-based coding agent, another local CLI) — the same result. This is not
   a single-vendor artifact.

4. **The effect is cleanest where agents have no ambient default.** GitHub Copilot adds no automatic AI
   trailer, so its control commits were genuinely undisclosed; the convention moved it from *nothing* to a
   clean `ai` disclosure.

## Controlling for ambient disclosure

Some agents (Claude Code, Cursor) append a `Co-authored-by: <agent>` trailer to **every** commit,
convention or not. A naive "did it disclose?" check is saturated by this default. The scorer therefore
separates **ACO-specific, deliberate disclosure** (`Authored-by-ai` / `Authored-by-human` / `Assisted-by`
/ witnessed spans) from the **ambient default**, and credits only the former. Under this measure the
control rate is 0 across all three agents — the ambient `Co-authored-by` is present in the control but is
not an ACO disclosure. For Claude Code and Cursor, the convention's value is *upgrading* the ambient,
coarse `co-authored` signal into a deliberate, correctly-categorized `ai` disclosure.

## How the measurement works

`score.mjs` reads only what each commit **states** — git trailers and any committed `.madeby/spans`
evidence — using the same recognizers as the `madeby` CLI. It never inspects the code to infer
authorship. This is disclosure, not detection: a commit counts as disclosed only if its author put a
recognized signal on the record.

## Caveats (honest scope)

- **Sample sizes are modest** — strongest for Claude Code (6 vs 9), smallest for Copilot (1 vs 1). The
  direction is consistent and the contrast is large, but more trials (and more agents) would tighten it.
  The harness makes adding them cheap; contributions welcome.
- **Headless vs. interactive.** The Claude Code and Cursor batches used each tool's non-interactive CLI
  (`claude -p`, `cursor-agent -p`). Same model and tools, but the interactive surface may differ.
- **The task is small and fixed** (implement a `slugify` function). A single task shape; varying it is a
  natural extension.
- **Point-in-time.** Agent behavior changes with model and tooling updates. Dates and versions are
  recorded above; re-running is the intended way to keep this current.

## Reproduce or extend it

See [README.md](./README.md). Add an agent, vary the task, or run more trials, and open a PR updating this
table. The harness is designed so a third party can verify the result independently.

## Follow-up (2026-10-19): naming the model version — `init --record-model`

The `with-model` condition uses the convention exactly as `madeby init --record-model` writes it: the
standard ACO block plus one line asking AI disclosures to add `--model <version>` — *"If you don't
know your model version, leave it off — never guess."* Same task, same no-mention protocol. Pre-release
run: the fixture's AGENTS.md points at a local build of the CLI (the published one predates `--model`).

| Agent | Model (truth) | ACO-disclosed | Model named | What it wrote |
|-------|---------------|---------------|-------------|---------------|
| Claude Code (v2.1.304) | `--model sonnet` → Claude Sonnet 5.5 | **3 / 3** | **3 / 3**, all correct | `Authored-by-ai: Claude Code:claude-sonnet-5-5` |
| Cursor (`cursor-agent`) | Auto (Cursor picks; not reported) | **4 / 4** | **1 / 4** | `Authored-by-ai: Cursor` ×3; `Cursor:composer-2` ×1 |

- **The disclosure itself held: 7 / 7**, every one the honest `ai` category.
- **Claude Code knows its model and named it every time**, matching its own ambient
  `Co-Authored-By: Claude Sonnet 5.5` trailer.
- **Cursor on Auto mostly left the model off — the instruction working as written.** An agent routed
  by "Auto" often doesn't know which model served it; omitting beats guessing. The one value it gave,
  `composer-2`, can't be checked under Auto (Cursor's list shows `composer-2.5`), so treat Auto-era
  model names as low-confidence. Named-model Cursor runs weren't possible on the account used (free
  plan: Auto only) — a gap to close.
- **Implication:** model-level provenance is reliable where the agent is pinned to a model, and
  honestly absent where a router chooses. `coverage` reports exactly what was written, so the gap shows
  up as rows without a model rather than as wrong ones.

Reproduce: `MADEBY_BIN=<path to madeby.mjs> AGENT=claude AGENT_MODEL=sonnet node run-batch.mjs 3 with-model`
(omit `MADEBY_BIN` once the published CLI has `--model`).

### Round 2 — the model from the tool's own record (`madeby` reads it; the agent needn't know)

`me --with-ai` / `ai` now read the model from the running tool's record when the repo records models:
Cursor's `CURSOR_MODEL` (set in its agent shell, even under Auto), the Copilot CLI's session log, Claude
Code's transcript. The AGENTS.md line now says so. The harness also gained the **Copilot CLI**
(`AGENT=copilot`) and stops leaking the launching shell's agent variables into each trial.

| Agent | Model (truth) | ACO-disclosed | Model named | What it wrote |
|-------|---------------|---------------|-------------|---------------|
| Copilot CLI 1.0.100 | default → Claude Sonnet 5.5 (session log) | **4 / 4** | **4 / 4**, all correct | `Authored-by-ai: Copilot CLI:claude-sonnet-5.5` |
| Claude Code 2.1.304 | `--model sonnet` → Claude Sonnet 5.5 | **2 / 2** | **2 / 2**, correct | `Authored-by-ai: Claude Code:claude-sonnet-5-5` |
| Cursor (Auto) | not reported | **3 / 4** (1 run error) | **0 / 4** | `Authored-by-ai: Cursor` |

- **Copilot CLI**, untested until now, followed the convention every time. (A first batch was blocked by
  its own permission prompt: the pre-release CLI lived outside the trial repo. The harness now passes
  `--allow-all-paths` for pre-release runs; the published `npx madeby` doesn't need it.)
- **Cursor: unresolved.** The agent ran `madeby ai Cursor`, and the CLI fills the model from
  `CURSOR_MODEL` when it's set (verified by simulating Cursor's shell), yet no trial recorded one — so in
  those runs the variable likely wasn't in the shell that ran madeby. Diagnosing it hit the account's
  free-plan usage limit. Next: re-run on a Cursor plan with quota, logging the shell's `CURSOR_*` vars.

### Round 3 — madeby 0.3.9 published; Copilot on both surfaces

| Agent | ACO-disclosed | Model named | On the pushed commit |
|-------|---------------|-------------|----------------------|
| Copilot CLI 1.0.100 (local, `npx madeby@latest`) | **3 / 3** | **3 / 3**, correct (`claude-sonnet-5.5`) | yes |
| Copilot coding agent (cloud, `gh agent-task`) | **1 / 1** | **1 / 1** (`gpt-6-luna`, from its session log) | **no** |

The cloud agent read AGENTS.md, ran `npx madeby@latest ai "GitHub Copilot"`, and madeby filled the
model from the session log (the cloud agent runs the Copilot CLI) — `Authored-by-ai: GitHub
Copilot:gpt-6-luna` on its local commit. But the platform pushed its own rebuild of the commit,
without the amended trailer. (The September trial's amendment did survive — timing.) The commit still
classifies `ai` from its `copilot-swe-agent[bot]` identity, but loses the deliberate disclosure and the
model. Fix (0.3.10): `--print` emits the trailer lines for the commit message itself, and the ACO block
(v2) tells agents whose platform makes the commit to use it.

### Round 4 — madeby 0.3.10: `--print` survives the cloud agent's push

Copilot coding agent (cloud), ACO block v2: it ran `npx madeby@latest ai Copilot --print` and put the
line in its commit message. The **pushed** commit (9e7fbec) carries `Authored-by-ai: Copilot:gpt-6-luna`
— disclosure and model both on the record. **1 / 1.** One more fix it surfaced: a commit authored by an
AI agent's bot identity (`copilot-swe-agent[bot]`) classified `ai` from the identity alone and ignored
its trailers, so the model wasn't credited; the classifier now folds them in, and `coverage` shows
`Copilot · gpt-6-luna`.
