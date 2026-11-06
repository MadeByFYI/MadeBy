# Disclosing after the fact — the disclosure commit (design, draft 2026-11-06)

Status: **draft for review**. Nothing here is built yet.

## The problem

A disclosure counts only when it is in the commit message. Fixing a missed one means rewriting the
commit (amend, rebase). In a repo that forbids rebasing and merges one branch into several targets
(dev, stage, prod), a developer who fails a `required` check has no allowed way to fix it. Found in a
field evaluation on an Azure DevOps repo of about 15 developers, where this decides whether `required`
mode can be used at all. The answer has to work for orgs of thousands.

## The proposal

Disclose earlier commits with a **new, empty commit** whose message says who wrote them:

```
Disclose authorship of 3 earlier commits

Discloses: 4f1c2a9e0b7d3c6a5e8f9b1d2c3a4e5f6a7b8c9d
Discloses: 9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b
Discloses: 0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c
Authored-by-human: Wren Ito <wren@example.com>
Assisted-by: Claude Code
```

The `Discloses:` lines name the commits by full hash; the trailers after them are the ordinary ACO
disclosure, and they apply to each commit named. Nothing is rewritten, so it is allowed in a
no-rebase repo. It is an ordinary commit, so:

- **It goes through review.** It is pushed, reviewed and merged like any other commit, under the
  same branch policies. No disclosure enters the shared history unreviewed.
- **The check re-runs by itself.** Pushing it updates the PR, which re-runs the build.
- **It travels with the branch** into every target the branch is merged into (dev, stage, prod).
- **Nothing new to operate.** No new refs, no extra fetch step or token in CI, and git hosts already
  handle commits at any scale.

It fits the invariants: each subject is a commit's own hash (invariant 1, a reference to a native
content hash), and the disclosure is a self-report like a trailer, so it is **asserted**, never more
(invariants 3 and 5).

### Writing one

The disclosing commands gain `--for`:

```sh
madeby me --with-ai "Claude Code" --for origin/dev..HEAD
madeby ai "Claude Code" --for 4f1c2a9e
madeby me --for origin/dev..HEAD
```

- `--for` takes a commit or a range, and makes the disclosure commit on the current branch instead
  of amending HEAD. One category per disclosure commit; commits written differently get their own.
- **Only your own commits.** A commit is skipped unless its author email is yours
  (`git config user.email`). You can say who wrote your work, not someone else's.
- **Only undisclosed commits.** A commit whose message already discloses, or that an earlier
  disclosure commit covers, is skipped. Skipped commits are listed with the reason.
- **Empty only.** It refuses when changes are staged, so a disclosure commit never carries content.
- Then the developer pushes as usual.

### Reading them

`check`, `coverage` and `who` apply a disclosure commit to the commits it names, under these rules:

- **It can only describe the past.** A named commit counts only if it is an ancestor of the
  disclosure commit.
- **Your own commits only.** A named commit counts only if its author email matches the disclosure
  commit's. Others are ignored and reported.
- **The commit's own message comes first.** A disclosure commit only fills in a commit whose message
  discloses nothing. If both disclose and disagree, the message wins and `coverage` reports it.
- **A later disclosure commit corrects an earlier one** for the same commit (someone wrote
  `with_ai` and meant `ai`). Both stay in history, so the correction is visible.
- **It isn't scored itself.** An empty commit with `Discloses:` lines is metadata, like a plain
  merge, so `coverage` doesn't count it as authored work. One that changes content is scored
  normally and its `Discloses:` lines are ignored.
- **Late is labeled.** In `--json` a disclosure applied this way says so (`via: disclosure-commit`,
  with that commit's hash), and `coverage` counts how many disclosures arrived late.
- `coverage` looks for disclosure commits across all history reachable from what it scores, not
  only inside the window, since a disclosure can be newer than the commits it names.

### The spec

ACO §5 gains the disclosure commit as a carrier: the `Discloses:` trailer, the ancestor and
same-author rules, message precedence, and late labeling. Any implementation reading ACO applies
the same rules.

## Costs

- One extra commit each time someone discloses late.
- Commits already merged, with no PR open, need a small PR to land the disclosure commit. In
  practice the same `task/<id>` branch goes to stage and prod later, so the next merge carries it.

## Open questions

1. **The trailer's name.** `Discloses:` is short and reads well; an ACO-specific name
   (`ACO-Discloses:`) can't collide with anything another tool writes. Recommendation: `Discloses:`
   with full hashes only, which no other convention uses.
2. **Hash length.** Full hashes only (40 hex for SHA-1, 64 for SHA-256), so a reference can never be
   ambiguous. Costs readability, which the subject line covers.

## Considered and set aside

- **Git notes** (`refs/notes/madeby`). They attach to a commit without changing it, and Azure Repos
  and GitHub both accept them (tested 2026-11-06 with `scripts/probe-notes-push.sh`). Set aside
  because they bypass review and branch policies (anyone with push access can add, change or delete
  any note, or force-push them all away), because uploading one doesn't re-run the PR check, and
  because a ref per person to contain that runs to thousands of refs in a large org. Still a
  possible later option for disclosing commits that are already merged.
- **Disclosure in the PR description.** Attached to the PR, not the commit, so it doesn't survive the
  same commit being merged to stage and prod by other PRs, and it isn't in git for `coverage` or
  `who` to read.
- **Disclosing someone else's commits**, including in bulk for a team. Each author discloses their
  own.
