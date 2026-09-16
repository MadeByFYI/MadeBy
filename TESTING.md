# MadeBy — Test & QA Doctrine

> Companion to `ARCHITECTURE.md`. This doc is how we keep the product *trustworthy*, not just
> working — which for a trust instrument is the whole point.

The governing fact: **we sell trust, so our worst bug is not a crash — it's a confident wrong
answer.** That is the exact thing customers pay us *not* to produce. The entire QA strategy is
built around that inversion.

---

## 1. Two QA regimes — never conflated

The system has two fundamentally different kinds of component. Applying one QA style to both
is the central trap.

| | Trust/crypto core | Classification estimate |
|---|---|---|
| **Components** | fingerprinting, canonicalization, signatures, tier resolution, the invariants | human/AI % per unit |
| **Nature** | deterministic | probabilistic |
| **QA regime** | **soundness** — exact, reproducible, adversarially tested, pass/fail | **calibration** — labeled ground truth, precision/recall, calibration curves, drift |
| **"Passing" means** | bit-identical to the spec; forgeries rejected | honest about its own uncertainty |

The crypto must be **exact**; the estimate must be **honestly uncertain**. Treating the
estimate like crypto (expecting impossible exactness) or the crypto like the estimate
(tolerating "mostly works") both destroy us.

---

## 2. Severity inversion + fail-safe

**Over-claiming trust is the catastrophic bug class** — a forgery accepted as bound-tier, an
unrecognized carrier treated as verified, a confident wrong attribution. These are sev-0
release-blockers, categorically worse than a crash or a miss.

The design-level test property that follows:

> **The system must fail *safe*, never fail *confident-wrong*.** "No record found,"
> "processing," and "asserted/unverified" are all correct, safe outputs. Fabricated
> confidence is the only true failure.

A large share of the suite is simply: *under every adversarial or degraded condition, does the
tier degrade downward (toward unknown/asserted), never upward?* **Soundness > completeness.**

---

## 3. The invariants are the test spec

The enforceable invariants (`ARCHITECTURE.md` §10) each become an **adversarial test that
actively tries to violate them**, not a happy-path assertion:

- *Subject is a reference, never a re-hash* → assert no path mints a competing content hash.
- *Unrecognized carriers cap at asserted* → property test: random/malformed carriers, tier
  **never** exceeds asserted.
- *Signatures cover the canonical claim independent of carrier* → cross-carrier round-trip
  (sign in A, re-encode to B, verify) **and** the negative (mutate content → verify fails).
- *Percent-authored is a view, not stored truth* → assert it can't be persisted as ground truth.

Plus a **red-team suite** that thinks like an attacker: forge a badge; spoof a verified
identity; carrier-confusion; **canonicalization mismatch** (make a signature verify over
different bytes); **corpus poisoning**; **prompt injection via a malicious repo** through both
ingestion and the ops agent; **hash enumeration against private content**. And **mutation
testing on the tier-resolution logic** — introduce a mutant that promotes asserted→verified
and confirm a test kills it.

---

## 4. Verifiability without open source

The strongest trust is **"don't trust us — verify."** We achieve it with **published
conformance artifacts**, *not* by open-sourcing the implementation.

> **Verifiability comes from open *contract + evidence + means-to-check*, not visible source.**
> A bound-tier claim is trustworthy because its signature verifies against an open spec with
> open tooling — not because anyone can read our resolver.

| Must be public | Stays fully closed |
|---|---|
| The **spec** (format, canonicalization, tier policy, invariants) — already open per the carrier-registry decision (`ARCHITECTURE.md` §3) | Ingestion pipeline |
| **Test vectors** — inputs → expected outputs, with adversarial negatives first-class | Classifier internals |
| A **verification path** — ideally existing open tooling (Sigstore/cosign, standard crypto over the canonical claim); optionally a small standalone verifier | Resolver service, analyzer, UI, business logic |

The test vectors make the implementation's correctness **checkable without making it
visible** — if we pass the published adversarial vectors, correctness on those cases is
established without anyone reading our source. This is the normal pattern for crypto, C2PA,
and Sigstore (open formats + public vectors; proprietary implementations everywhere).

**Residual gap, stated plainly:** closed source means "trust our prod code matches reference
behavior on cases the vectors don't cover." We close most of it with (a) broad adversarial
vectors, (b) reproducible builds + signed releases + a transparency log so the deployed
artifact is pinned and can't be quietly swapped, and (c) the fail-safe design (§2). The
leftover is small, bounded, and smaller than what a one-time private audit would leave.

**Delivered (#18):** the small verifier is open — [`@madeby/verifier`](packages/verifier),
built only on the open `@madeby/core`. The bound-tier suite is pinned to **Ed25519 over the
RFC 8785 (JCS) canonical claim payload** (`ed25519-jcs-v0`): a standard, deterministic primitive
any stack can check. The end-to-end recipe — including a generic-tools path (`openssl` / Python
`cryptography`) that uses **no MadeBy code** — and reproducible vectors (positive + adversarial)
are in [`VERIFYING.md`](VERIFYING.md). Open verifier, closed generator.

---

## 5. The probabilistic regime

Test vectors don't work for the estimate (no single "correct" output). The publishable
artifact is a **labeled benchmark + published methodology + calibration report + open eval
harness**, so others can reproduce our *accuracy and calibration claims*. This is where
outside validation genuinely adds credibility — and the right "auditor" is the
**research/OSS community reproducing a benchmark**, not a pentest firm. The published benchmark
ships with its methodology + calibration and invites community reproduction (invariant #7).

---

## 5b. Social/economic abuse model — the abuse red-team (#72)

The crypto red-team covers *forgery*. The larger surface of an open "assert anything" claiming
surface is **social/economic** abuse, where the win condition isn't breaking a signature but
exploiting volume and cost asymmetry. The model + status:

| Vector | Control | Status |
|---|---|---|
| **Mass-squatting** — one actor asserts authorship over many subjects to poison the index | `detectCorpusPoisoning` flags actors whose *cheap (unsigned)* claims span ≥ threshold distinct subjects → T&S review | **code-enforced** (`@madeby/core`, `abuse.ts`) |
| **Adjudication by display** — flood a contested page with cheap claims so volume reads as consensus | `boundClaimStandings` renders every evidence-backed claim + a bounded head of asserted, collapses the rest behind "N other asserted claims" | **code-enforced** (`abuse.ts`) |
| **Zero-cost claiming** — no identity price on an asserted claim | Identity-cost: claiming requires GitHub OAuth (raises squatting cost) | **app-layer** (needs the live app) |
| **API scraping / flooding** | Abuse controls and API metering are the *same mechanism* (one budget) | **app-layer** |

Two invariants govern the code-enforced half: (a) **flag and bound, never adjudicate or delete** —
competing claims are ranked + labeled, never suppressed (invariant #9); a poison flag is a prompt to
*review*, not a verdict. (b) **Cost, not identity, is the signal** — signed (identity-cost-paid)
claims never count toward the poison signal, so the detector rewards exactly the behavior we want.
These live as red-team vectors in `abuse.test.ts` (the harness extended beyond crypto). The two
app-layer controls land with the live app and fold into its privacy/abuse review.

---

## 6. Dogfood canary + reproducibility

- **Our own repo is the first subject** (dogfood epic #1). **Reproducibility/regression only, not
  accuracy ground truth** (review 2026-06-29): its provenance is `Co-Authored-By` trailers *we
  wrote*, so testing the classifier against them is circular — it proves the regex is stable, not
  correct. It breaks loudly if resolution drifts; that's its job.
- **Accuracy is measured against an INDEPENDENT corpus** — `ground-truth-v0` (`@madeby/classify`),
  whose labels rest on provenance *other than the trailer* (era / autonomous-agent account /
  publicly-documented AI builds). It reports the honest headline the synthetic benchmark hid:
  **recall on untrailered AI = 0%** for the trailer-only v0 (0 human false-positives). Published in
  `GROUND-TRUTH.md`; the gap closes with witnessed session-log evidence (#68), not heuristics.
- **Golden fixtures** — known repos → known fingerprints → known claims — catch nondeterminism.
- **Reproducibility is itself a tested property**: same content always resolves the same way;
  canonicalization is deterministic.

---

## 7. The credibility gate (self-satisfiable)

> **No public "verified/proven" claim until the open conformance suite + reproducible red-team
> harness exist, are published, and pass — covering the deterministic core.** The probabilistic
> index ships with methodology + calibration and invites community reproduction.

No dependency on finding/funding an external auditor; the published artifact *is* the gate,
and it stays checkable forever. A paid pentest is reserved for **infrastructure** security
(servers, secrets, isolation) when budget allows — orthogonal to the trust claims.

---

## 8. The CI trust-gate

The soundness suite is a blocking release gate, like a security gate:

- Invariant/property tests + mutation tests on tier logic
- Conformance test vectors (including adversarial negatives)
- Golden-fixture reproducibility checks

If any fail, the build does not ship. The calibration/eval suite runs continuously and gates
*claims about accuracy*, not every deploy.

**As implemented (#21):** three GitHub Actions checks — `typecheck + build`, `trust-gate
(soundness suite)` (runs `pnpm test`: invariants + the #17 conformance vectors), and `mutation
(tier-resolution logic)` (Stryker over `resolve`/`resolution`/`tiers`, **break 90%**, currently
~96%) — are **required status checks on `main`** via branch protection, so a regression in the
trust core cannot merge. Mutation is scoped to the tier-resolution logic because that's where a
silent escalation bug would live; canonicalization/fingerprint outputs are already pinned by the
conformance vectors. Broadening mutation coverage is a follow-up.

---

## 9. Definition-of-done by regime (ties to the backlog)

- **Deterministic tickets** (#9 standard, #11 fingerprinting, #14 resolver; invariants in #8)
  ship **with their conformance test vectors** and pass the CI trust-gate.
- **The probabilistic ticket** (#12 classification) ships **with its benchmark + calibration
  report + eval harness**.
- Cross-cutting suites (red-team harness, reference verifier, CI gate, transparency log) are
  owned by the **Trust-QA epic**.
