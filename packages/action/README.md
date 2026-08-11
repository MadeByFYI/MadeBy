# MadeBy disclosure check — GitHub Action

A thin wrapper around the `madeby` CLI (`packages/cli`). It reads your repo's
`.madeby/policy.json` and evaluates each of a PR's commits against it, failing the check only when
your policy's `mode` is `required`.

**Disclosure, never detection.** The check asks contributors to *state* their origin (an AI trailer,
a DCO `Signed-off-by:`, a signed commit, or a `madeby prove` attestation). It never asserts whether
code is AI. **You own the policy** — advise or block, ban or welcome AI; that's set in your own
`.madeby/policy.json`, and this action neither advises nor obstructs.

## Prerequisite

The `madeby` CLI must be published to npm (the action runs `npx madeby check`). Until then this
manifest is ready but inert.

## Usage

`.madeby/policy.json` (advisory to start; switch to `required` when ready to gate):

```json
{ "version": 0, "mode": "advisory" }
```

`.github/workflows/disclosure.yml`:

```yaml
name: Disclosure
on: pull_request
jobs:
  madeby:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # the action needs the PR's base commit to scope base..head
      - uses: MacDougherty/MadeBy/packages/action@main
```

That's the whole wedge: **commit two files.** No app to install, nothing hosted, no data leaves your
CI. Set `mode: required` in `.madeby/policy.json` and add the check to branch protection when you
want it to actually gate.
