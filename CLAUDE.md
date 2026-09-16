# CLAUDE.md — AI assistant context for MadeBy (v2)

MadeBy is a verifiable content-provenance layer answering "who made this thing?", starting
with code. This is a from-scratch v2 build; the v1 attempt is archived under `archive/v1/`
(reference only — do not build on it).

## Read the spec first

The design is authoritative and lives in the root spec docs — consult them before implementing:

- `ARCHITECTURE.md` — asker-pull spine, hash = join key (two-hash invariant), attestation standard + carrier registry, provenance DAG, **enforceable invariants (§10)**
- `TESTING.md` — trust/QA doctrine: two regimes, soundness > completeness, **verify without open source**

## Non-negotiable invariants (ARCHITECTURE §10 / TESTING)

1. A claim's subject is a **reference** to a native content hash, never a re-hash into our envelope.
2. Signatures cover the **canonical claim payload**, independent of carrier.
3. Unrecognized carriers / unverifiable signatures **cap at the asserted tier**.
4. "Percent authored" is a computed **view**, never stored ground truth.
5. The system **fails safe** — degrade to asserted/unknown, never to falsely-verified.
6. Aggregate indices are labeled estimates with surfaced tier distribution.

## Stack

- Monorepo via **pnpm workspaces** (no Turborepo/Nx yet).
- `apps/web` — Next.js (Vercel). `packages/core` — shared TS trust logic (the publishable boundary).
- DB: **Neon Postgres + pgvector**, **Drizzle** ORM (wired in #8).
- Cold path: **Modal** (Python). Edge/badges: **Cloudflare Worker** + R2.

## Conventions

- Work is tracked as GitHub issues under epics; keep ticket status current (label `in-progress`,
  comment progress, close + check the epic box when done).
- We dogfood: this repo records its own provenance (#1). Commits should be signed and carry
  accurate `Co-Authored-By:` trailers. **Disclose authorship per ACO (see `AGENTS.md`):** after
  committing AI-assisted work, run `madeby me --with-ai <tool>` (adds `Authored-by-human:` +
  `Assisted-by:` → classifies `with_ai`).
- End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
