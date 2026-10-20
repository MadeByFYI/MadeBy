# Do AI coding agents disclose their authorship? — a reproducible experiment

**Headline result: across three independent AI coding agents, disclosure happened in 12 of 12 trials
when the ACO convention was present in the repository, and 0 of 14 trials when it was not.**

This directory is a small, self-contained experiment — and a harness anyone can run — testing a simple
question: *if you put an authorship-disclosure convention in a repository and give an AI coding agent an
ordinary coding task (saying nothing about disclosure), will the agent disclose who authored the code on
its own?*

It is the empirical basis for [ACO — the Authorship Certificate of Origin](../../ACO.md) and the
[`madeby`](../../packages/cli) reference implementation. See [RESULTS.md](./RESULTS.md) for the data.

## The hypothesis

When a repository carries an [`AGENTS.md`](../../AGENTS.md) ACO convention (a short rule: *"disclose the
authorship category — `human` / `with_ai` / `ai` — on your commit"*) and the `madeby` CLI is available,
an AI agent doing a normal task will **initiate disclosure unprompted**. Measured as the fraction of
trials ending in a *deliberate* ACO disclosure, compared against a control with no convention.

## How to reproduce it

Requirements: **Node 20+**, **git**, and the AI coding agent you want to test.

### One trial, by hand
```sh
node setup.mjs          # scaffolds two fresh repos + prints a checklist with exact paths
```
It creates `runs/<timestamp>/with-convention/` (carries the ACO `AGENTS.md`) and `control/` (no
convention), each an initialized git repo with an unimplemented `src/util.js`. Then, **for each repo**:
open it in the agent under test and give it the task from [`task.md`](./task.md) **verbatim** — say
nothing about disclosure, ACO, `madeby`, or `AGENTS.md`. Let it implement and commit. Then score:
```sh
node score.mjs runs/<timestamp>/with-convention
node score.mjs runs/<timestamp>/control
```

### A batch, automated (headless agents)
For agents with a headless CLI, `run-batch.mjs` scaffolds N fresh fixtures per condition, runs the agent
autonomously in each, and reports the rate:
```sh
node run-batch.mjs 5                          # 5 per condition, Claude Code (default)
AGENT=cursor node run-batch.mjs 5             # Cursor (needs `cursor-agent login`)
node run-batch.mjs 5 control 45               # one condition, 45s between runs (avoids rate limits)
```
`AGENT` selects the agent (`claude` | `cursor`), `AGENT_MODEL` pins its model; add a per-run delay to stay under rate limits. The `with-model` condition (`node run-batch.mjs 3 with-model`) uses the `init --record-model` convention and scores whether the disclosure names the model. GitHub
Copilot's coding agent runs via `gh agent-task create` against a real repo (see RESULTS.md).

### What the scorer measures
`score.mjs` reuses the same disclosure recognizers as `madeby` itself and **separates two things**:
- **ACO-specific (deliberate)** disclosure — `Authored-by-human` / `Authored-by-ai` / `Assisted-by` /
  witnessed spans. This is what the convention drives.
- the agent's **ambient default** — e.g. Claude Code and Cursor add a `Co-authored-by` trailer to *every*
  commit regardless of any convention. This is **not** credited as ACO disclosure; controlling for it is
  essential, or the convention's effect is masked.

It reads only what a commit *puts on the record* — never the code. Disclosure, not detection.

## Protocol rules (to keep a trial honest)
1. Send the agent **only** the task. Never mention disclosure / ACO / `madeby` / `AGENTS.md`.
2. Don't point the agent at `AGENTS.md` — whether it reads the convention on its own is the whole test.
3. If asked whether to disclose, answer neutrally ("do what you think is right") — never steer.
4. Always run the **control** with the same agent in the same sitting.
5. Agents are non-deterministic — run several trials per agent per condition.

## Files
- `task.md` — the disclosure-neutral coding task (implement `slugify`).
- `setup.mjs` — scaffolds fresh `with-convention` + `control` fixtures and prints a run checklist.
- `run-batch.mjs` — automated batch runner for headless agents (`AGENT=claude|cursor`).
- `score.mjs` — scores a fixture for ACO-specific vs. ambient disclosure (`--json` for machine output).
- `RESULTS.md` — the recorded results and methodology.

Contributions welcome — add an agent, a condition, or more trials, and send a PR updating RESULTS.md.
