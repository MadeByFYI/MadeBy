# How this repo records its own provenance

MadeBy dogfoods from commit zero (#1): this repository is the first subject in the registry, and we
capture our own provenance into immutable git history **now** so it can be resolved retroactively
once the pipeline exists (#3). This doc makes that convention legible to contributors.

> **Honest tier reality.** History resolves at **commit-tier** (we have trailers, not retroactive
> session logs); ongoing work resolves at **span-tier + signed** once signing is on. This repo's own
> coverage will show the split — a live demo of "order evidence, don't overstate."

## 1. Signed commits (operator action — bound tier)

Signing binds each commit to a verified key, so work from here forward can reach the **bound** tier.
We use **SSH commit signing** (simplest; no GPG keyring). One-time setup, per operator:

```bash
# reuse an existing SSH key or make one: ssh-keygen -t ed25519 -C "you@madeby.fyi"
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
# so `git log --show-signature` verifies locally:
echo "$(git config user.email) namespaces=\"git\" $(cat ~/.ssh/id_ed25519.pub)" >> ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
```

Add the **same public key** to GitHub (Settings → SSH and GPG keys → *New SSH key* → type **Signing
Key**) so commits show **Verified**. Check a commit: `git log -1 --show-signature` (`%G?` should be
`G`, not `E`/`N`). This is the one step the tooling can't do for you — it's your key.

## 2. Commit-level attribution — `Co-Authored-By:` trailers

Every commit carries accurate `Co-Authored-By:` trailers naming any AI that contributed, e.g.:

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

This is our commit-tier human/AI signal (parsed by `@madeby/classify`). Verify the whole history is
well-formed and see the human/AI split:

```bash
pnpm provenance:verify-trailers          # all non-merge commits
pnpm provenance:verify-trailers <range>  # e.g. origin/main..HEAD
```

It exits non-zero on a malformed trailer. (`scripts/verify-trailers.mjs` mirrors the classifier's
open provider list deliberately — it's dependency-free so it runs anywhere.)

## 3. Span-level attribution — the `.madeby/` manifest

Finer than a commit: which **spans** an AI authored, attested out-of-band so commit content hashes
stay untouched. The convention (types in `@madeby/core`'s `span.ts`; format in `manifest.ts`):

- **Out-of-band & content-anchored.** A commit's spans live in a sidecar at
  **`.madeby/spans/<commit-sha>.json`**, each anchored by the span's content **fingerprint** (not
  line numbers, which drift). The same payload can later move to a **git-notes** ref — it's
  carrier-independent (`ARCHITECTURE.md` §3).
- **The operator signs, never "the AI".** Each attestation carries open `provider` / `model` /
  `modelVersion` fields **plus `operatorId`** — the human/org whose key stands behind the
  AI-authored span (`ARCHITECTURE.md` §4). The manifest is operator-signable (`signature` over
  `canonicalizeSpanManifest`).
- **Model-agnostic.** Any agent (Claude / Copilot / Cursor / …) can emit it.

Capture for a commit (writes/updates the sidecar):

```bash
pnpm provenance:capture            # HEAD
pnpm provenance:capture <commit>   # a specific commit
```

### v0 granularity, stated honestly

`capture-spans` currently attests at **file granularity**: for an AI-assisted commit, each
added/modified file gets an attestation anchored by its git blob SHA, attributing the AI model (from
the trailer) under the committer as operator with `source: "git-commit-trailer-v0"`. This records
*"AI assisted this file, operated by X"* — **not** a fabricated percentage (consistent with "name
the creator; uncertainty in the tier"). **Line-level spans captured from Claude Code session logs
(the AI as its own witness) are the next refinement** — the manifest format already holds line hints
and structural-fingerprint anchors for when that lands.

A human-only commit (no AI trailer) correctly produces **no** attestations.

## 4. What's captured where

| Granularity | Where | Tier it can reach |
|---|---|---|
| Commit human/AI | `Co-Authored-By:` trailers (in git) | commit-tier (bound once commits are signed) |
| File / span | `.madeby/spans/<sha>.json` (sidecar) | span-tier; operator-signed → verified/bound |

All of this lives in git and is resolvable later (#3) — **nothing here depends on `madeby.fyi`
existing.**
