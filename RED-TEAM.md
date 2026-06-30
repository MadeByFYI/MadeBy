# MadeBy — Red-Team Report

> The internal red-team, shipped as a **reproducible harness + this report** (`TESTING.md` §3/§7)
> — so the claims are *checkable*, not asserted. It's "re-run our audit," not "trust our audit."
>
> **Re-run it:** `pnpm --filter @madeby/core test` (runs `redteam.test.ts`), or call the exported
> `runRedTeam()` from `@madeby/core` and inspect the results. The harness is
> `packages/core/src/redteam.ts`.

## Coded attacks (run on every CI build via the trust-gate)

Each attack *attempts* to break a guarantee under strong attacker assumptions; "resisted" is the
safe outcome. All currently pass.

| Attack | Vector | Defense | Result |
|---|---|---|---|
| **carrier-confusion** | claim `bound` via an unrecognized carrier | unknown carrier caps at `asserted` | ✅ resisted |
| **forged-signature** | `bound` claim whose signature doesn't verify | invalid signature caps at `asserted` | ✅ resisted |
| **anonymous-signer** | valid signature, but signer identity unverified | unverified signer caps at `asserted` | ✅ resisted |
| **unsigned-escalation** | assert `bound` with no evidence (the "forged badge" case) | a *claim* grants nothing; tier is evidence-based → `asserted` | ✅ resisted |
| **fuzzy-bound** | claim byte-binding (`bound`) over a fuzzy fingerprint | no exact byte binding → degrades to `verified`, never `bound` | ✅ resisted |
| **subject-envelope-injection** | use a MadeBy-internal envelope hash as the subject | two-hash invariant: subject must be a native reference → rejected | ✅ resisted |
| **canonicalization-tamper** | replay a signature over altered content/attribution | altering any signed field changes the canonical bytes | ✅ resisted |
| **malformed-carrier** | smuggle a claim in an unrecognized carrier as "recognized" | self-describing parse flags `recognized:false` → caps at `asserted` | ✅ resisted |
| **priority-land-grab** | an earlier-registered asserted squatter tries to outrank a later verified owner | priority is a weak tiebreaker, never overrides stronger evidence → the owner is the origin (§11) | ✅ resisted |
| **signed-copied-bytes** | a valid `bound` signature over *copied* bytes claims to be the origin | authenticity ≠ origination (invariant #10): a derivative is not crowned → surfaced as open + divergence, never falsely-verified | ✅ resisted |

**Complementary:** mutation testing (#21) independently proves the tier-resolution tests *kill*
escalation bugs (≥90% break, ~96% actual) — not just exercise the code.

## Deferred vectors (documented now; testable once their component exists)

Honest disclosure — these are real attack surfaces whose code doesn't exist yet. Each has a
designed containment; the red-team coverage lands with the component.

| Vector | Status / planned containment |
|---|---|
| **Prompt injection via a malicious repo** (ingestion + the Claude-ops agent) | Containment designed in `OPERATIONS.md` §10 (capability tiers, egress-injected credentials, no secrets in the sandbox). Testable with ingestion (#10) / the ops agent. |
| **Corpus poisoning** | Pending the ingestion pipeline (#10) — bounded/sampled corpus + asserted-tier-only for ingested claims limits blast radius. |
| **Real cryptographic signature forgery** | Modeled here via an injected `verifySignature` → false. Real-crypto verification arrives with the signing/verification path (#18). |
| **End-to-end badge image forgery** | A faked badge image carries no trust state; the resolver page is authoritative (badge is a pointer, never proof — `STRATEGY.md` §5). Full integration test lands with the live badge service / resolver pages. |
| **Hash enumeration against private content** | The resolver returns *not-found* for unknown fingerprints (no leak beyond existence); salted/scoped fingerprints for private subjects are pending (`ARCHITECTURE.md` §2). |

Owned by the **Trust-QA epic (#16)**; updated as new attack surfaces and components land.
