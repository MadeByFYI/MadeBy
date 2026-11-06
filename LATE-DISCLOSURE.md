# Disclosing after the fact — git notes (design, draft 2026-11-06)

Status: **draft for review**. Nothing here is built yet.

## The problem

A disclosure counts only when it is in the commit message. Fixing a missed one means rewriting the
commit (amend, rebase). In a repo that forbids rebasing and merges one branch into several targets
(dev, stage, prod), a developer who fails a `required` check has no allowed way to fix it. Found in a
field evaluation on an Azure DevOps repo of about 15 developers, where this decides whether `required`
mode can be used at all.

## The proposal

Let a disclosure live in a **git note** on the commit, in the ref `refs/notes/madeby`. A note is
attached to the commit's SHA without changing the commit, so the history, the SHAs and every branch
the commit was merged into stay as they are. One note covers the commit everywhere it was merged.

This is not a new carrier. ACO §5 and ARCHITECTURE §3 already list git-notes as one; this makes it
the first one `check` and `coverage` read besides the message.

It fits the invariants: the subject is the commit's own hash (invariant 1, a reference to a native
content hash), and a note is a self-report like a trailer, so it is **asserted**, never more
(invariants 3 and 5).

### What a note says

The same trailer lines a commit message carries, so one recognizer reads both and a person can read
it with `git log --notes=madeby`:

```
Authored-by-human: Wren Ito <wren@example.com>
Assisted-by: Claude Code
```

(The JSON claim envelope the git-notes binding in `packages/core/src/carriers.ts` serializes stays
for signed claims later. Trailer lines are what a person or an agent writes today.)

### Writing one

The disclosing commands gain a target other than HEAD:

```sh
madeby me --with-ai "Claude Code" --note <commit|range>
madeby ai "Claude Code" --note <commit|range>
madeby me --note <commit|range>
```

- `--note` writes the note instead of amending. HEAD is the default target; a range covers many
  commits at once, e.g. `origin/dev..task/1234` for a branch's commits.
- **Only your own commits.** A commit is skipped unless its author email is yours
  (`git config user.email`). You can say who wrote your work; you can't say it for someone else.
  Skipped commits are listed.
- **Never overwrites.** A commit that already discloses, in its message or a note, is skipped.
- Then it pushes the notes ref: fetch, merge (`git notes merge -s cat_sort_uniq`), push, retry on a
  race. Notes refs aren't pushed by default, so this step is what makes the note visible to CI.
  `--no-push` leaves it local.

### Reading them

- `check`, `coverage` and `who` read `refs/notes/madeby` alongside the message.
- **The message comes first.** A note only fills in a commit whose message discloses nothing. If both
  disclose and disagree, the message wins and `coverage` reports the conflict.
- A note-borne disclosure is labeled as such (`via: note`) in `--json`, and `coverage` counts how
  many disclosures came by note, so late disclosure is visible rather than blended in.
- Policy: notes count by default. `"notes": false` in `.madeby/policy.json` turns them off for a
  project that wants disclosure only in the commit itself.

### CI has to fetch the notes

A checkout doesn't fetch notes refs, and the pipelines `init` writes keep no credentials (0.3.13). So
the generated pipeline fetches the notes ref in a step **before** madeby runs, with the build's token
passed for that one command only and never written to disk:

- Azure: `git -c http.extraheader="AUTHORIZATION: bearer $(System.AccessToken)" fetch origin
  +refs/notes/madeby:refs/notes/madeby`
- GitHub: the same with `${{ github.token }}`; on a public repo no token is needed.

A missing notes ref (nobody has written one yet) is not an error.

A note pushed after the check ran doesn't re-run it; the developer re-queues the build. `check`
says so in its failure message.

### Locally

`madeby init` offers to add the notes refspec to the clone's fetch config, so `git fetch` brings the
notes and `coverage` and `who` see them. Local config only, never committed.

## Open questions

1. **Does Azure Repos accept pushes to `refs/notes/*`?** Not documented either way. GitHub accepts
   them (it no longer shows them in its UI, which doesn't matter here). To be tested on a real Azure
   repo with `scripts/probe-notes-push.sh` before building anything. If Azure refuses, the fallback is
   a branch holding the notes (`refs/heads/madeby-notes`), which Azure must accept, with the same
   commands on top.
2. **Branch permissions.** Even if Azure accepts the ref, a repo's permissions may restrict who can
   create refs. The probe reports what happens for an ordinary contributor.
3. **One shared ref or one per person** (`refs/notes/madeby/<id>`)? One ref is what git's tooling
   expects (`--notes=madeby`) and the merge-and-retry handles contention at this team size. Per-person
   refs avoid contention entirely and make who-wrote-the-note obvious, at the cost of a custom read.
   Recommendation: one ref.
4. **Signed notes.** The notes ref's own commits can be signed, which could lift a note to verified
   later. Out of scope for the first version; notes are asserted.

## Not doing

- Disclosure in the PR description. It is easy to write, but it is attached to the PR, not the
  commit, so it doesn't survive the same commit being merged to stage and prod by other PRs, and it
  isn't in git for `coverage` or `who` to read.
- Disclosing someone else's commits, including in bulk for a team. Each author discloses their own.
