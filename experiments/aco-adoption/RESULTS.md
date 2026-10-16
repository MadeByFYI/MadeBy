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
