# MadeBy

**Who made this thing?** — a verifiable content-provenance layer, starting with code.

This is the v2 build. The design lives in the spec docs at the repo root:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — asker-pull spine, hash-as-join-key, attestation standard, invariants
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
`.env.example` → `.env` and fill in the values listed there.

## Provenance (we dogfood)

This repo records its own provenance from commit zero — signed commits, `Co-Authored-By:` trailers,
and a `.madeby/` span manifest. See [`PROVENANCE.md`](./PROVENANCE.md); verify with
`pnpm provenance:verify-trailers`.

## Tickets

Work is tracked as GitHub issues, organized under epics (#1 dogfood, #4 foundations,
#5 read-side, #6 producer-push, #16 trust-QA).
