# MadeBy

**Who made this thing?** — a verifiable content-provenance layer, starting with code.

This is the v2 build. The design lives in the spec docs at the repo root:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — asker-pull spine, hash-as-join-key, attestation standard, invariants
- [`TESTING.md`](./TESTING.md) — the trust/QA doctrine (publishable conformance; verify without open source)

The first attempt is archived under [`archive/v1/`](./archive/v1/) — reference only.

## The CLI — `madeby`

The product ships as a zero-infra CLI that runs against your local git history. Disclosure, not
detection: it reports what contributors put **on the record** and never guesses whether code is AI.

```sh
npx madeby coverage   # the scoreboard: how much of your repo's authorship is disclosed
npx madeby init       # drop the ACO AGENTS.md convention + a CI disclosure check into your repo
npx madeby check      # the gate: do commits meet .madeby/policy.json? (advisory by default)
npx madeby who        # made by whom? what's on the record for a file or the whole repo
npx madeby ai         # an AI agent discloses it authored HEAD  (Authored-by-ai:)
npx madeby me         # affirm you authored HEAD yourself (--with-ai [tool] for assisted)
```

`madeby coverage` is the maintainer's scoreboard — known (disclosed) vs unknown authorship, the
human/with_ai/ai mix of the known, and the asserted-vs-verified trust split, as a labeled estimate.
Built on **ACO**, the open [Authorship Certificate of Origin](./ACO.md) standard. Full docs:
[`packages/cli`](./packages/cli#readme) · on npm: [`madeby`](https://www.npmjs.com/package/madeby).

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
