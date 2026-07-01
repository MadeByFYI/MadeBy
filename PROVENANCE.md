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
the creator; uncertainty in the tier"). A human-only commit (no AI trailer) correctly produces
**no** attestations.

### Witnessed evidence — session logs (the recall fix, #68)

The commit trailer under-detects AI: inline autocomplete and many tool edits leave **no trailer**,
so a heavy AI user can read as ~100% human. The highest-fidelity *honest* signal is the AI tool's
**own session log** — the tool as its own witness.

**Recommended — `madeby capture --local` (#80).** Run **one command now** (no hook to have set up
months ago): it reads *your own* AI-tool logs locally, and only attests files whose AI-authored
content is **structurally still present** in your checkout — matched by structural fingerprint, so
attribution survives squash / rebase / reformat. AI work that was rewritten or discarded (low
similarity) is honestly **not** attested. Privacy-clean by construction: logs and content never
leave your machine; only derived attribution (fingerprint + path + model) is written.

```bash
pnpm provenance:capture-local [transcript.jsonl] [commit]    # autodiscovers the newest session
```

(The simpler `provenance:capture-session` also exists — it anchors by git blob SHA at a commit
rather than structural fingerprint; `capture-local` supersedes it for accuracy.)

The mirror **folds this evidence in** (`@madeby/analyzer` reads `.madeby/spans` from a checkout or a
clone) and surfaces "🔬 witnessed AI spans in N files" alongside the commit number — recall the
trailers missed, as **evidence rather than a noisy heuristic**. (We deliberately do *not* infer AI
from diff-size/cadence heuristics: they're frequently wrong and risk over-claiming about people who
never opted in — the one sin the doctrine forbids. For a *stranger's* repo with no session log we
show only what the trailers support; we never fabricate the gap.)

This is also the reference **emitter**: the `.madeby` manifest is the vendor-neutral contract any
tool or hook can fill (ship to the tools, don't wait for them). v0 is file-level; line-level spans
ride the same format (it already holds line hints + structural-fingerprint anchors).

**Multi-tool via a pluggable harness (#85).** Capture is split into a per-tool **`ToolParser`**
(`tool-parsers.ts`) — `{ id, provider, detect(raw), parse(raw) → AiEdit[] }` — and a shared
structural-match backend (`capture-local.ts`). Adding a tool (Cursor, Copilot, Windsurf, Aider) is
one isolated parser that normalizes its logs to `AiEdit[]`; nothing else changes. **Claude Code is
the reference parser.** Other parsers are intentionally *not* stubbed with guessed schemas — a
parser lands when we have that tool's real sample logs (evidence, not guessing).

> **Recalibration on a real labeled corpus** (untrailered-recall as the headline number) is tracked
> separately as the independent ground-truth corpus (#73) — the synthetic benchmark can't measure
> the real-world untrailered case.

## 4. What's captured where

| Granularity | Where | Tier it can reach |
|---|---|---|
| Commit human/AI | `Co-Authored-By:` trailers (in git) | commit-tier (bound once commits are signed) |
| File / span (trailer-derived) | `.madeby/spans/<sha>.json` · `source: git-commit-trailer-v0` | span-tier |
| File / span (witnessed) | `.madeby/spans/<sha>.json` · `source: claude-code-session-log` | span-tier; the recall fix (#68) |

All of this lives in git and is resolvable later (#3) — **nothing here depends on `madeby.fyi`
existing.**
