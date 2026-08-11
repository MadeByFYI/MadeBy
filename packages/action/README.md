# MadeBy disclosure check — GitHub Action

A PR check that asks contributors to **disclose the origin** of the code they're submitting — and
reports how much of a PR does. It recognizes the disclosure signals that already exist in the wild,
so most contributions need *nothing new*.

> **Disclosure, not detection.** It never tries to guess whether code is AI — no tool can do that
> honestly, and false-accusing a contributor is worse than the problem it solves. It reports what
> contributors *state* about their code's origin. **You own the policy**: advise, require, or
> effectively ban — that's your call, set in a file in your repo. Nothing is hosted; nothing leaves
> your CI.

## See it work

A contributor opens a PR with two commits — one discloses its origin, one doesn't. With the policy
set to `required`, the check fails and names the gap (this is real `madeby check` output):

```text
madeby check — 1/2 commits disclose origin (required; accepts: any recognized disclosure). 1 undisclosed.

Undisclosed commits (1):
  ✗ cdf9baca  feat: add subtract helper

To disclose: add a Co-Authored-By / Generated-by trailer, a DCO Signed-off-by, sign the commit,
or attest with 'madeby prove'. (Disclosure, not a ban — what this project requires is set in .madeby/policy.json.)
```

The fix is **one trailer line, not a rewrite** — the contributor adds a `Signed-off-by:` (or a
`Co-Authored-By:` naming the tool) and re-pushes:

```text
madeby check — 2/2 commits disclose origin (required; accepts: any recognized disclosure).
```

Exit 0 — the gate passes. Run against MadeBy's own history it reports **87/90** disclosed: coverage
is a gradient you raise, not a purity test. Start in `advisory` (reports, never fails) and switch to
`required` when you're ready.

## What counts as "disclosed"

A commit discloses its origin if it carries any of:

- an **AI-authorship trailer** — `Co-Authored-By:` / `Generated-by:` / `Assisted-by:` naming an AI
  tool (Claude Code, Copilot, Cursor, aider, … already emit these);
- a **DCO `Signed-off-by:`** line;
- a **cryptographic signature** on the commit;
- a **`madeby prove`** attestation (a contributor's own captured AI-session record).

Bot/automation commits (dependabot, codegen) are recognized as machine-authored automatically.

## Setup — two files

**1. `.madeby/policy.json`** — your policy (start `advisory`; it only *reports* until you're ready):

```json
{ "version": 0, "mode": "advisory" }
```

- `advisory` — report the disclosure coverage on each PR; never fails the check.
- `required` — fail the check on any commit that discloses nothing your policy accepts.
- `off` — no gate.
- optional `"accept": ["dco-signoff", "ai-trailer", ...]` — restrict what satisfies the policy
  (omit ⇒ any recognized disclosure counts).

**2. `.github/workflows/disclosure.yml`:**

```yaml
name: Disclosure
on: pull_request
jobs:
  madeby:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # so the action can scope to the PR's own commits (base..head)
      - uses: MacDougherty/MadeBy/packages/action@v0.1.0
```

That's the whole thing: **commit two files.** No app to install, nothing hosted, no data leaves your
CI. When you're ready to *gate*, set `"mode": "required"` and add the check to branch protection.

## Other hosts — Azure DevOps (and more)

The gate is **git-native, host-adapted**: the same `.madeby/policy.json` and the same `madeby check`
run anywhere git does. Only the CI wrapper differs. For **Azure DevOps**, use the Pipelines steps
template ([`azure-pipelines-disclosure.yml`](./azure-pipelines-disclosure.yml)) and wire it as a **PR
build-validation branch policy**:

```yaml
steps:
  - template: azure-pipelines-disclosure.yml@MadeBy   # or a local/relative path
    parameters:
      version: latest
```

On a PR build `madeby check` **auto-scopes to the PR's own commits** from the Azure environment — no
range logic in your YAML (the `azure-devops` host adapter reads `BUILD_REASON` +
`SYSTEM_PULLREQUEST_*`).

For **GitLab**, include the CI job ([`gitlab-ci-disclosure.yml`](./gitlab-ci-disclosure.yml)) — on a
merge-request pipeline it auto-scopes from `CI_MERGE_REQUEST_DIFF_BASE_SHA` + `CI_COMMIT_SHA`:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/MacDougherty/MadeBy/v0.1.0/packages/action/gitlab-ci-disclosure.yml'
```

Any other forge is a single adapter away; until one ships, run `npx madeby check <range>` as a plain
CI step on that host (compute the range from that host's env).

## What a contributor does to pass a `required` gate

Whatever discloses origin — add a `Co-Authored-By:` / `Generated-by:` trailer, a DCO `Signed-off-by:`,
sign the commit, or run `madeby prove`. The check comments a short summary and points to how.

## Honest notes

- **It's a partial fix.** Disclosure + accountability, not a slop-blocker. A `required` gate deters
  low-effort drive-bys (like the DCO does) and gives you a basis to triage — it does not detect AI.
- **You decide the meaning.** MadeBy ships the neutral instrument; whether a project *advises* or
  *bans* on the disclosure is yours, and we neither recommend nor obstruct.
- **Nothing leaves your CI.** The check runs entirely in your runner against your own git history.

## Prerequisite

The `madeby` CLI must be published to npm (the action runs `npx madeby check`). Until it's published
this manifest is ready but inert — see the project owner.
