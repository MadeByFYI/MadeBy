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
madeby check [<range>]         Evaluate commits against .madeby/policy.json (the disclosure gate).
                               <range> e.g. origin/main..HEAD — a PR's own commits.
madeby prove  [<log>] [<ref>]  Capture your AI session log's witnessed spans into .madeby/spans.
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

A ready-made GitHub Action wraps `madeby check` — two committed files, nothing hosted. See
[`packages/action`](https://github.com/MacDougherty/MadeBy/tree/main/packages/action#readme).

## Honest scope

Disclosure and accountability, **not** an AI slop-blocker or detector. A `required` gate deters
low-effort drive-bys (as the DCO does) and gives a basis to triage — it does not, and will never,
claim to detect AI.

MIT · part of [MadeBy](https://github.com/MacDougherty/MadeBy)
