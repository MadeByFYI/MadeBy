# AGENTS.md — Authorship disclosure convention (ACO)

This repository participates in **ACO — the [Authorship Certificate of Origin](./ACO.md)**. If you are an
AI agent, or a human working with one, **disclose who authored the changes you make.** Disclosure is
expected here, low-friction, and honest per commit. (This file is also the reference convention — copy it
into your own repo; see the last section.)

## The rule

When you author or modify content in this repo, disclose the authorship **category** on your commit —
one of:

- **`human`** — a human authored it, no AI involvement.
- **`with_ai`** — a human authored it with disclosed AI assistance.
- **`ai`** — an AI agent authored it (a human remains accountable).

Disclose **per commit, honestly** — the category describes what actually happened for *that* change (a
doc that's a human's intellectual content is `human` or `with_ai`; a mechanical refactor an agent did on
a one-line instruction is closer to `ai`).

## The one-line way (asserted tier — no keys, no setup)

After you commit, run the matching command. It works with no install via `npx`:

| Category  | Command                              | Adds to the commit                       |
|-----------|--------------------------------------|------------------------------------------|
| `human`   | `npx madeby me`                      | `Authored-by-human:`                     |
| `with_ai` | `npx madeby me --with-ai <tool>`     | `Authored-by-human:` + `Assisted-by:`    |
| `ai`      | `npx madeby ai <session-log>`        | witnessed AI-span evidence               |

**This repo dogfoods it:** a commit an AI drafted under human direction and review is disclosed with
`npx madeby me --with-ai "Claude Code"`, which classifies it `with_ai`.

Higher tiers (`verified` / `sworn` / `bound`) layer on later as signatures and identity anchoring become
available — they never invalidate the asserted claim, only corroborate it. See **[ACO.md](./ACO.md)**.

## Why

So consumers of this code can see *who and what* made it and apply their own policy — without anyone
inferring authorship from the source. Undisclosed content stays *unknown*, never a guess.

## Adopt this in your repo

Copy this file (or just its rule) into your own `AGENTS.md` / `CLAUDE.md`. That is the whole convention:
an agent that reads it discloses; the disclosure is verifiable per ACO by anyone, with no dependency on
any single tool.
