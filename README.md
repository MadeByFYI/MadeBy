# MadeBy

**Who made this thing?** — a verifiable content-provenance layer, starting with code.

New here? Start with [`VISION.md`](./VISION.md) — a plain-language overview of what we're building
and why (no jargon; good for non-technical readers).

This is the v2 build. The design lives in four spec docs at the repo root:

- [`STRATEGY.md`](./STRATEGY.md) — positioning, trust model, wedge, go-to-market, monetization
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — asker-pull spine, hash-as-join-key, attestation standard, invariants
- [`OPERATIONS.md`](./OPERATIONS.md) — provider stack, dashboards, cost governance, agentic ops
- [`TESTING.md`](./TESTING.md) — the trust/QA doctrine (publishable conformance; verify without open source)

The first attempt is archived under [`archive/v1/`](./archive/v1/) — reference only.

## Repo layout

```
apps/web/            Next.js web app (Vercel)
packages/core/       Shared deterministic trust logic — canonicalization,
                       fingerprinting, tier resolution + conformance vectors.
                       This is the publishable / open boundary (TESTING.md §4).
workers/badge/       Cloudflare Worker — live-served badge SVGs        (stub)
services/ingestion/  Python (Modal) — public-git ingestion + compute    (stub)
```

## Develop

```bash
pnpm install
pnpm dev          # runs apps/web at http://localhost:3000
pnpm typecheck    # tsc across packages
pnpm build        # build all packages
pnpm test         # trust-gate suite (conformance vectors land in #17)
```

Requires Node ≥ 22 and pnpm 10.

## Provisioning (handoff)

The skeleton builds with no external services. To run against real infrastructure, copy
`.env.example` → `.env` and provision the providers listed there (Neon, Cloudflare, Modal,
GitHub App, observability). See `OPERATIONS.md` §4.

## Tickets

Work is tracked as GitHub issues, organized under epics (#1 dogfood, #4 foundations,
#5 read-side, #6 producer-push, #16 trust-QA).
