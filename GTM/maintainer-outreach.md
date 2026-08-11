# Maintainer outreach — the first-user wedge

The forcing-function flywheel (`STRATEGY.md §3`) ignites on **one AI-slop-weary maintainer** adopting
the disclosure gate. This is the note to reach them — and the honest posture to hold.

## Before you send anything

- **Publish `madeby` to npm first.** The Action runs `npx madeby check`; the quickstart is inert
  until the package is live (`packages/action/README.md`). Don't send outreach to a 404.
- **This is validation, not a sale.** The win is: they install it *or* tell you why they won't. Both
  are the signal you actually need. Treat a "no, because X" as the most valuable reply.

## Who to target (a handful, not a blast)

- **High-dependency-centrality maintainers** — popular libraries. One adoption seeds both sides
  (their contributors become disclosers; their `.madeby` travels to everyone who depends on them).
- **People who've *publicly* complained about AI-PR slop** or posted a "no AI" / "disclose AI"
  contribution policy — they already feel the pain and have shown they'll act on it.
- Warm > cold. A maintainer who already knows you, or an adjacent community, converts far better.

Pick ~5. This is a conversation, not a campaign.

## Finding targets (`scripts/find-targets.mjs`)

You **can't count a repo's AI PRs directly** — the slop is *undisclosed*, which is the whole reason
MadeBy exists. So the reliable signal that a repo is "dealing with a lot of AI PRs" is that a
maintainer publicly **reacted**. `find-targets` surfaces three reactions via GitHub search (needs
`gh` authenticated), warmest first:

- **`[template]`** — they put an AI-disclosure question in their PR template. They already do our
  thing *by hand*; we automate + enforce it. **The warmest possible pitch.**
- **`[policy]`** — they wrote an AI-PR rule into `CONTRIBUTING.md`. They felt it and acted.
- **`[complaint]`** — an open issue/proposal about AI-PR slop *right now*. Perfect timing.

```
node scripts/find-targets.mjs           # ranked, tagged list
node scripts/find-targets.mjs --json    # machine-readable
```

It ranks by reach (an org-wide `owner/.github` template is scored by the org's flagship repo, shown
as `org-wide → owner/flagship`). **Honest limits:** keyword-based (misses silent sufferers),
rate-limited, and `[complaint]` titles need eyeballing (search matches the issue *body*, so some
titles are unrelated) — a target finder, not a census. Re-run it before a fresh round; the list
drifts.

### Snapshot (2026-08-11) — where I'd start

Warmest first, not merely highest-reach:

- **`[template]`, high reach — they've already bought the premise:**
  `sindresorhus/awesome` (495k★ — Sindre keeps surfacing), `nuxt` (61k★, via `nuxt/.github`),
  `eslint` (27k★, via `eslint/.github`).
- **`[complaint]`, loud and timely:** `yt-dlp/yt-dlp` (184k★, *"Why are AI-generated pull requests a
  thing?"*), `microcks` (2k★, *"Proposal: Adopt Organization-wide AI Contribution Policy and PR
  Templates"* — couldn't script that timing).
- **`[policy]`, they wrote the rule:** `coollabsio/coolify` (60k★), `rclone/rclone` (59k★),
  `photoprism/photoprism` (40k★), plus CNCF-adjacent `pipe-cd/pipecd`.

Tailor the note's "[specific pain]" line to each maintainer's **own words** — for `[complaint]`
rows, quote the issue title back to them.

## The note (short, honest, low-ask)

> **Subject:** a disclosure check for AI PRs (disclosure, not detection)
>
> Hi [name],
>
> You've been dealing with the wave of AI-generated PRs — [specific: the low-effort ones / the
> license questions / the "did a human even read this" ones]. I built a small thing that might help,
> and I want your honest read before I tell anyone it's ready.
>
> It's a GitHub Action that asks contributors to **disclose** their code's origin on a PR. It
> recognizes what's already there — `Co-Authored-By` / `Generated-by` trailers, DCO sign-offs, signed
> commits, committed AI-tool configs — and reports a coverage number. **It's disclosure, not
> detection:** I deliberately don't try to guess whether code is AI (no honest tool can, and
> false-accusing a contributor is worse than the problem). What you *do* with the disclosure —
> advise, require, or effectively ban — is entirely your policy, set in a file in your repo. Nothing
> is hosted; nothing leaves your CI.
>
> Adoption is two committed files. If you're up for it, try it on one repo and tell me where it's
> wrong or useless — I'd genuinely rather hear that now than ship something that wastes maintainers'
> time.
>
> [link to the quickstart]
>
> Thanks either way,
> [you]

## Why this note works (and the lines to never cross)

- **Leads with their pain**, named specifically — not with our product.
- **"Disclosure, not detection" up front** — it pre-empts the "so it's another broken AI detector?"
  reflex, and it's the honest differentiator.
- **"You own the policy"** — respects that it's their repo; we're not moralizing about AI.
- **The ask is feedback, not commitment** — and inviting "tell me where it's useless" is disarming
  *and* the real research.
- **Never** promise it blocks AI or detects AI (it does neither). Never imply we detect. Never dress
  a validation ask as a launch. Honesty is the moat — the outreach has to embody it or the whole
  positioning is hollow.

## What a good outcome looks like

- **Best:** they install it and send you what's wrong → your first real user + your first real bug list.
- **Also great:** "no, because ___" → the sharpest product signal you can get pre-launch.
- **Fine:** silence from most. Five thoughtful conversations beat fifty installs from a blast.
