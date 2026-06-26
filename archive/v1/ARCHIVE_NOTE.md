# Archived: MadeBy v1

This directory contains the **first attempt** at MadeBy — a content-attribution web app
(Next.js + Prisma + Postgres) built to get a feel for one possible shape of the idea.

It is **archived for reference only.** The v2 design deliberately departs from the
assumptions baked into this code. Do not build on it directly. See, at the repo root:

- `STRATEGY.md` — product positioning, wedge, go-to-market, monetization.
- `ARCHITECTURE.md` — the technical design v2 is built against.

## What v1 was, in one paragraph

A registry where a producer fills out a form, gets a PNG badge with a QR code, and
displays it next to their content. It supported HUMAN / AI / WITH_AI declarations,
verified *identities* (email/phone/domain/address), an optional unverified content hash,
git commit references, legal representations ("under penalty of perjury"), an API, and an
MCP server that wrapped the same CRUD endpoints.

## Why we departed from it (the load-bearing lessons)

1. **It was an honor system in a verification costume.** Identity verification was real,
   but nothing verified the *claim about the content* — the content hash was stored and
   never checked; C2PA/SynthID were in the schema/docs but unimplemented.
2. **The badge↔content binding was decorative** — a picture you place next to your work,
   trivially copyable, with no binding to the actual bytes.
3. **The schema was speculative** — e.g. a hardcoded `AIModel` enum that rots every model
   launch, plus several elaborate but empty tables.
4. **It was built for the producer, not the asker** — "who made this?" is asked by someone
   *holding the artifact*, and that path barely existed.

These lessons are what `STRATEGY.md` and `ARCHITECTURE.md` are a response to.
