# MadeBy — Architecture / Product / GTM Pressure-Test

> An outside-in review by a senior architect lens (systems + product + GTM). Scope was
> deliberately broad: not just "is the code here good," but "what is weak, and what is
> *missing*." Strengths are noted briefly; the body is weaknesses, by request. Findings
> reference files/sections so they stay checkable.
>
> Reviewed: the four spec docs (`STRATEGY`/`ARCHITECTURE`/`OPERATIONS`/`TESTING`), `VISION`,
> the supporting docs, all six packages, and `apps/web`. Snapshot date: 2026-06-29.
> Amended 2026-06-29 to account for the Stripe Atlas provisioning dependency (revises
> Finding 2 and the re-sequencing list). Each weakness carries an inline **Recommendation**
> block; the closing **"What I'd re-sequence"** list is the cross-cutting priority order.
>
> **Revised 2026-06-30** after two remediation passes — PRs #66–#77 (findings + concerns) and
> #78–#84 (the mirror-accuracy follow-up + salted fingerprints). The original findings are
> preserved as the 2026-06-29 baseline; a **Status update** scorecard follows the BLUF, each
> finding ends with a dated **Status** line, and the Finding 1 follow-up carries an assessment of
> the accuracy build. Still gated by Stripe Atlas.

---

## Bottom line up front

This project has built the **moat** and stubbed the **flywheel**. The deterministic trust
core (`@madeby/core`) is genuinely strong — canonicalization, tier resolution, a sophisticated
two-axis contention model, conformance vectors, a ~96% mutation gate, an open verifier. The
strategy and vision docs are unusually deep and self-aware.

But the parts that actually acquire users barely exist, and the one that does exist rests on a
foundation that **structurally cannot deliver the promise that drives the entire go-to-market.**
Almost every weakness below traces to one root cause:

> **The team's temperament — careful, honest, exhaustive, fail-safe, unwilling to overclaim —
> is exactly right for a proof core and exactly wrong for a top-of-funnel growth hook. That
> temperament has been applied to the whole system. So the core is excellent and the funnel is
> fixtures.**

One qualifier raised after the first draft, now folded in: a large share of the funnel is
**structurally blocked** on company formation — the Stripe Atlas pole gates the bank → company
card → all paid providers → deploy/migration (PROVISIONING §steps 3–6). That partially *forces*
the moat-vs-funnel imbalance rather than fully explaining it by temperament — and it relocates
the single biggest risk onto a founder-only, days-long real-world task that isn't yet done.
Finding 2 is revised accordingly.

That frame directly answers the three founder concerns that prompted this review (user-facing
complexity, hedging-vs-mission, and the missing feedback loop). The most severe substantive
findings come first, then the three concerns head-on, then what's missing, then re-sequencing.

---

## Status update — 2026-06-30 (after PRs #66–#77)

The team ran a remediation pass and it is unusually complete — **real, tested code, not just
doc edits**, with the parts that can't ship before Atlas built as dormant seams (e.g. the
PostHog transport activates on `POSTHOG_KEY`; the funnel events fire from day one). The BLUF's
original thesis — "the funnel is fixtures" — **no longer holds**: the infra-free funnel slice is
now built. The remaining exposure narrows to (a) the **Atlas bottleneck itself** (still open,
founder-only), (b) a genuine **product residual on Finding 1** (honesty is fixed, but detection
recall on a stranger's repo stays near-zero until session-log capture is adopted — chicken-and-egg
with the AI-tool-integration item), and (c) a set of **pre-public-launch build items** that are
correctly *designed now, built later* (salted fingerprints, opt-out/takedown, claim/verify flow,
abuse controls).

| # | Weakness | Status | Evidence |
|---|---|---|---|
| 1 | Trailer-only classifier / overclaimed precision | **Honesty fixed; recall closed for Claude Code owners — multi-tool gap open** | local capture (`capture-local.ts`, #80), coverage-led result (`coverage.ts`, #79), wider evidence-grade signals (#78), session-log spans (#68), honest ground-truth corpus (#73). Residuals: Claude-Code-only parser, uncalibrated match threshold, file-not-hunk granularity (see Finding 1 follow-up) |
| 2 | Atlas gate / unblocked work not prioritized | **Unblocked work shipped; Atlas still the gate** | in-memory mirror built (`clone.ts`, #67); classifier work shipped. Deploy / persistence / verified tier remain blocked on Atlas (per founder) |
| 3 | Public inference pages w/o consent | **Design done; salted-fp now built, rest pending pre-launch** | consent gate + aggregate-only index (ARCH §8/§11); **salted/HMAC private fingerprints now built** (`private-fingerprint.ts`, #70/#84) — enumeration-resistant. Still pending: opt-out/takedown endpoint + permissioned-resolution wiring (Atlas-gated; no public path live yet) |
| 4 | Sworn-tier liability | **Resolved** | sworn tier deferred until counsel (STRATEGY §2); product-liability legal pack is a formation deliverable (COMPLIANCE) |
| A | Feedback not first-class | **Built** | triple-duty `feedback.ts` (correction → eval label → funnel event), corrections store, `analytics.ts` funnel seam, feedback route, correction form, changelog page |
| B | User-facing complexity | **Resolved** | progressive-disclosure hard rule + concept budget (ARCH §1); analyze page ships a bold one-line answer + "Show the evidence" expander |
| C | Hedging / no strategic focus | **Resolved** | PRIMARY line chosen (mirror → verified tier), other two demoted to optionality, dated commitment (STRATEGY §6) |
| M1 | AI-tool integration is uncontrolled | **Partially addressed** | session-log capture script + vendor-neutral `.madeby` manifest read path; broad third-party adoption remains the open risk (and is what bounds Finding 1's recall) |
| M2 | No Sybil/abuse model | **Resolved in design; build pending** | identity-cost + bounded adjudication-by-display + corpus-poisoning detection (ARCH §11); not built (no claim flow yet) |
| M3 | Dogfood canary circular | **Resolved** | dogfood reclassified reproducibility-only; independent `ground-truth-v0` is the correctness corpus (TESTING §6) |
| M4 | Agentic-ops over-engineered | **Resolved** | descoped to read-only + propose-PR; rest parked post-traction (OPERATIONS §10) |
| M5 | Commit-% vs code-% conflation | **Resolved** | labeled exactly "% of commits with AI involvement" across UI + docs |

**Net (after two remediation rounds, #66–#84):** the honest-and-buildable-without-Atlas work is
essentially done. The mirror-accuracy plan (Finding 1 follow-up) shipped — local capture,
evidence-grade signals, coverage-led framing — and the salted-fingerprint privacy primitive
landed. What's genuinely left splits three ways: **(1) the founder task** (Atlas, gating deploy /
persistence / verified tier / PostHog transport / signing); **(2) accuracy residuals now that the
easy wins are in** — multi-tool capture parsers (today Claude Code only), calibrating the
structural-match threshold, and hunk-level attribution for a real code %; **(3) the
pre-public-launch checklist** — opt-out/takedown, abuse controls, the legal pack. Nothing left is
a correctness or honesty defect; it's scope gated on either the founder or the launch.

---

## 1. The viral hook is structurally broken for the exact audience it targets (most severe)

The entire cold-start sequence rests on one magic trick: *"connect your code, see how much of
it is AI — a surprising, shareable ego-number"* (STRATEGY §4, the Spotify-Wrapped pattern).

The engine that produces that number is `packages/classify/src/classify.ts` — **97 lines of
regex over `Co-Authored-By:` trailers and commit-author strings.** Consequences:

- **It does not measure "how much of your code is AI." It measures "how many of your commits
  carry an AI trailer."** Those are wildly different numbers.
- **The dominant form of AI assistance — inline autocomplete (Copilot, Cursor tab-complete) —
  emits no trailer.** You accept a suggestion and commit under your own name; it is 100%
  invisible to v0. Cursor and IDE Copilot don't write `Co-Authored-By` by default; many Claude
  Code users squash or strip trailers.
- **So the heaviest AI users — the declared viral surface, the vibe-coders — will frequently
  show as ~100% human.** The mirror hands a vibe-coder "you're 95% human," which is both *wrong*
  and the *opposite* of the surprising, shareable number the flywheel needs. The "surprise" the
  whole strategy is built around is structurally absent for the target user.
- **The badge promises a precision the engine can't produce.** STRATEGY §5 shows
  `🧑 62% · 🤖 38%`. You cannot derive a meaningful human-vs-AI *code* ratio from "this commit
  has a Claude trailer." The engine yields *commit-involvement %* (`analyze.ts:94`), closer to a
  binary. A solo dev using Claude Code with trailers gets "🧑 me — 200 commits · 🤖 anthropic —
  200 commits, AI-involved on 100% of commits." That's a constant, not an ego-ratio.

The cruel irony: **a trust company's flagship number is, in the badge framing, *more precise
than its evidence supports* — the one sin the whole doctrine exists to prevent.** The docs are
honest about recall (BENCHMARK: 0.77 on a 21-case synthetic set, deliberate false-negative
bias), but honesty about the gap doesn't close it. And the fix — span-level + session-log
evidence — depends on ingestion (#10) and AI-tool standard adoption that don't exist and are
partly outside your control (see §7).

The severity inversion is being misapplied. "Over-claiming is the catastrophic bug" is correct
for the *proof* tier. But the *mirror* is a curiosity toy, and for a curiosity toy that
systematically under-detects the thing it mirrors, **under-claiming is the fatal bug** — it
produces a boring, wrong result and the share never happens.

> **Recommendation — split the metric from the detector, and stop promising a precision you
> can't compute.**
> 1. *Reframe the headline to what the evidence supports.* Lead the mirror with **named AI
>    collaborators + a provenance-coverage number** ("how much of your work is provenance-
>    covered"), not a spurious human-vs-AI *code* ratio. That's honest, still shareable, and
>    keeps the door open to the broader proof-layer identity. Reserve a precise lines/tokens
>    split for the higher tiers where span evidence actually exists (invariant #6).
> 2. *Raise real signal without waiting on ingestion.* The highest-fidelity source is local and
>    already exists: the AI tools' **own session logs** (Claude Code transcripts, Cursor
>    history). Ship an opt-in CLI/hook that reads them → evidence-backed span attribution instead
>    of trailer-dependence. Diff-level heuristics (large atomic insertions, burst cadence) are a
>    weaker local fallback, but label them as such.
> 3. *Recalibrate against a real labeled corpus.* Replace the 21-case synthetic benchmark with
>    repos of known provenance (pre-AI-era = known-human; fully-generated samples = known-AI;
>    third-party-labeled mixed repos), and report **recall on *untrailered* commits as the
>    headline number**, since that is the real-world case the current 0.77 hides.

**Status (2026-06-30): honesty fixed, recall residual still open.** Rec 1 done — the mirror and
badge now lead with named collaborators + "% of commits with AI involvement," never an implied
code split (`analyze/page.tsx`, STRATEGY §5, ARCH §9). Rec 2 done as the *honest* path — witnessed
session-log span evidence is folded in (`provenance.ts`, #68), and diff heuristics were explicitly
refused to avoid the over-claim sin. Rec 3 done — the independent `ground-truth-v0` corpus reports
the brutal honest headline (**untrailered-AI recall = 0%**, 0 human false-positives;
`GROUND-TRUTH.md`, #73). **What remains:** on a *stranger's* repo with no `.madeby` manifest — i.e.
nearly all repos today — the detector still sees only trailers, so the "surprising ego-number" the
flywheel needs is still weak for the target audience. The fix is real but adoption-gated (it
depends on M1). This is now the **top product risk**, no longer a correctness/honesty bug.

### Finding 1 follow-up — how to make the mirror more accurate (2026-06-30)

The obvious fix (add "this looks AI-written" heuristics) is the wrong one — it over-claims about
non-consenting people and forfeits the one thing a trust brand sells. The real plan starts from a
reframe:

> **There are two different accuracy problems with opposite solutions.** (a) Accuracy on the
> user's *own* repo — the cold-start user, the conversion target — is **very solvable, honestly,
> today.** (b) Accuracy on a *stranger's arbitrary public* repo is **fundamentally bounded**: you
> have only public evidence, and the only way to "raise recall" there is to guess, which
> over-claims. So **don't chase a precise ratio on the stranger's repo** (impossible without
> lying); **pour the effort into the owner's number** — the user who matters for the flywheel.

**1. [PRIMARY, buildable now — no Atlas] Local session-log capture *at analyze time.*** The
`.madeby` manifest path is adoption-gated (the repo had to commit a manifest months ago, so ≈ no
repo has one). Collapse that barrier from "you set up a hook in the past" to "run one command
now": when someone analyzes **their own** repo, their AI tool's transcripts are already on their
disk (Claude Code under `~/.claude/projects/…`, Cursor in workspace storage, Copilot in editor
logs). Ship a local helper (`madeby capture --local`) that reads **their own logs locally**, and
**matches AI-edited regions to commits by structural/fuzzy fingerprint** (the §4 span anchor, so
it survives squash/rebase/reformat), emitting real span evidence. Privacy-clean by construction —
logs never leave the machine; only derived attribution is shared. This is *evidence*, not
inference, so it lifts recall doctrine-safely, and the capture step doubles as the on-ramp to
claim/verify — accuracy and the asserted→verified funnel become the same action.

**2. [buildable now] Mine more *evidence-grade* signals — not heuristics.** The current regex
leaves near-deterministic evidence on the table: trailers beyond `Co-Authored-By`
(`Generated-by:`, `Assisted-by:`, tool-specific), `@generated` file-header markers (§4),
bot/GitHub-App author identities (`devin[bot]`, `cursoragent`, Copilot-workspace authors,
AI-service noreply addresses), and declared PR/issue text ("built with Claude Code") as a tiered
edge. All extend recall on the *identifiable* class without touching the over-claim line.

**3. [buildable now] Fix the presentation so absence-of-signal stops reading as a confident
"human."** Today the miss is *silent*: untrailered AI → "🧑 95% human," which feels confident and
wrong. Instead: **lead with coverage, not the ratio** — "we can *prove* AI involvement in X% of
commits; **Y% is unattributed — we can't see how it was made**," with the unattributed fraction
visually dominant and an explicit upsell ("run capture / connect GitHub / sign commits to raise
this"). And **recalibrate the "human" verdict's language**: since untrailered recall is 0%, a
"human" reading on a post-~2022 repo is weak evidence — say so ("no AI signal found — for recent
repos this often means *undisclosed* AI, not no AI"). That converts the gap from a hidden
inaccuracy into an honest coverage number, which is also a better conversion hook than a fake
ratio.

**4. [where evidence exists] Attribute at hunk/line level, not commit level.** Commit-% is coarse
(one AI-touched line weighs the same as a fully-generated file). Where session-log/diff evidence
exists, attribute at the hunk level and label it a computed view (invariant #6) — the honest move
from "% of commits with AI involvement" toward "% of code," only as far as the evidence supports.

**5. [post-Atlas lever] GitHub App forge metadata.** Once the App is live it can read
authoritative provenance — PR author is a GitHub App / Copilot agent, check-run metadata — raising
recall on the identified class for repos you can't get local logs from. Queue it, don't block on
it.

**Explicitly not doing:** diff-size/cadence "looks-AI" heuristics in the headline — frequently
wrong, over-claims about non-consenting people, and the local-session-log path strictly dominates
them (real evidence, privacy-clean). Any behavioral hint, if ever, is a private/owner-only/opt-in
nudge that never publishes and never names — and even then, later.

**One-line pick:** build `madeby capture --local` and make the analyze result coverage-led —
together they make the owner's *first run* both accurate and honest, which is exactly the
cold-start moment the flywheel depends on, and neither needs Atlas.

#### Assessment of the follow-up build (2026-06-30, PRs #78–#84)

The team shipped this plan quickly and, more importantly, *correctly* — the honest details are
right, not just present:

- **Move 1 (local capture) — ✅ shipped, well.** `capture-local.ts` reads the user's own Claude
  Code transcript, anchors AI content by **structural fingerprint** (survives squash/rebase/
  reformat), and — the part that matters — **discards AI work not structurally present in the
  commit** (`similarity < threshold` → not attested). That's the doctrine applied correctly: it
  raises recall with *evidence* and refuses to claim AI content that didn't land. Pure engine +
  fs/git shell (`scripts/capture-local.mjs`), privacy-clean.
- **Move 2 (evidence-grade signals) — ✅ shipped.** Wider trailers (`Generated-by`/`Assisted-by`)
  and more agent identities, with real care not to collide with human names (`\bcursor(?:agent)?\b`,
  not bare "cody") and `matchAi` still gating per-entry so widening keys can't create a false
  positive. Evidence, not inference — as asked.
- **Move 3 (coverage-led) — ✅ shipped.** `coverage.ts` + the analyze page now lead with "AI
  provable in X%," make the **unattributed fraction prominent** ("we can't see how it was made"),
  and warn that a no-signal reading on a recent repo often means *undisclosed* AI. The silent
  "95% human" miss is gone.
- **Move 4 (hunk-level %) — partial.** Capture attests **per file**, not per hunk/line — so even
  witnessed, the number is still commit/file involvement, not a true code ratio. Fine for v0;
  the "% of code" precision still awaits hunk-level attribution.
- **Move 5 (GitHub App metadata) — correctly deferred** (post-Atlas).

**Residuals worth not losing (sharper now that the easy wins are in):**

1. **The witnessed-recall fix currently covers Claude Code only.** `capture-local.ts` parses the
   Claude Code transcript schema specifically. Cursor, Copilot, Windsurf, Aider, etc. have
   entirely different local-log formats and aren't parsed — yet they're part of the same viral
   surface. **This is now the biggest hole in the accuracy story:** the primary recall fix works
   for one tool. Next unblocked step is a small pluggable parser per tool (same structural-match
   backend), prioritized by audience size.
2. **The match threshold (0.5 cosine) is an uncalibrated knob, and it gates the one place a
   *witnessed* over-claim could occur.** Too low and capture attests AI content that isn't really
   what shipped (the over-claim sin, at the estimate layer). It needs calibration against ground
   truth, biased toward *discard* — this belongs in the probabilistic/calibration regime
   (TESTING §5), not a hardcoded default.
3. **Witnessed ≠ verified until signed.** Local capture raises **recall at the asserted tier** —
   a self-report over your own transcript, hand-forgeable — not trust tier. That's acceptable
   (classification is the estimate layer; crypto lives in core), but the UI should keep witnessed
   spans clearly at asserted until commit-signing (Atlas-gated) lifts them.
4. **The coverage math folds human-authored commits into "unattributed."** `unattributed =
   100 − provable-AI` labels commits with a *named human author and no AI signal* as "we can't see
   how it was made." Defensible (can't rule out undisclosed AI) and safe-direction, but slightly
   overstates the unknown — the named humans *are* attributed. A tighter split would be
   provable-AI / human-attributed-AI-unknown / fully-unattributed. Minor.

**Net:** the honest-and-buildable-without-Atlas recall work is now essentially done for the
Claude Code owner. What's left on accuracy is (a) **multi-tool parsers**, (b) **threshold
calibration**, (c) hunk-level for a real code %, and (d) forge metadata + signing (post-Atlas).
The stranger's-repo cold-open stays an honest "we can't see it" — correct, but it means the
*surprising* ego-number now exists only for owners who run capture on a Claude Code repo.

## 2. The funnel gap is partly forced by the Stripe Atlas bottleneck — but the *unblocked* funnel work still wasn't prioritized, and the human critical path is now the top risk

The first draft of this review read the funnel-is-fixtures state as a pure prioritization
failure. The Atlas dependency makes that partly unfair, and the corrected picture is sharper.

**What's genuinely blocked (not a choice).** PROVISIONING steps 3→5→6 put Stripe Atlas on the
critical path: a Delaware C-corp + EIN + Mercury bank + **company card** (~$500, ~days,
identity-verified, founder-only). The card gates *every* paid provider — Neon, Vercel, Modal,
R2, the GitHub App, PostHog/Sentry/Axiom (step 5) — which gates the deploy + Drizzle migration
(step 6), which is explicitly "what unblocks #10 ingestion, the real registry, dogfood #3, #15."
So the persistent registry, the index corpus, production deploy, the verified/bound tier in the
live path, **and even the funnel telemetry (PostHog)** are infra-blocked, not deferred by whim.
And the deterministic core is precisely the workstream that needs *no company, no money, no
providers* — pure local TS. A founder waiting on the Atlas pole pouring effort there is acting
rationally. Credit where due, and the provisioning plan itself is excellent (email-first
sequencing, hard spend caps, the QSBS clock, the 83(b) verification).

**What survives that nuance — and is the real finding.**

1. **Not all funnel work needs Atlas, and the infra-free slice is the most acquisition-critical
   one — yet it's unbuilt.** OPERATIONS §3 specs the mirror as "on-demand and nearly stateless —
   shallow-clone, analyze, return, persist a claim *only if claimed*." That means *accept a repo
   URL → shallow-clone → analyze in memory → render a share card* needs **no DB and no Atlas** —
   yet `apps/web/src/app/analyze/page.tsx:9` still reads `process.cwd()` (the server's own
   directory, not the user's repo), and the resolver still serves **one hardcoded fixture**
   (`registry.ts:74`). The single most important acquisition action — *"see your breakdown"* —
   is buildable today and isn't built. (`verifySignature: () => false`, `registry.ts:50`, is a
   correct fail-safe; it only bites once Atlas unblocks the verified path.)
2. **The classifier (Finding 1) is also pure local logic, fully unblocked — and is a 97-line
   regex.** The unblocked effort that *did* land went disproportionately to the elaborate
   contention/origination engine (`contention.ts`), which has lower immediate GTM value than
   either fixing the headline number or shipping the infra-free mirror.
3. **The critical path now runs through a single, days-long, founder-only, non-delegable
   real-world task — and it isn't done.** Everything sophisticated that's been built sits
   downstream-blocked behind it. That inverts the risk picture: the top risk is not a code gap,
   it's that **the Atlas pole hasn't been driven to completion while tractable downstream work
   accumulates** — the classic "do the fun part, defer the boring critical-path part" pattern.
   The plan is good; the exposure is execution latency on the one task only the founder can
   clear.

Bottom line: kick off Atlas immediately (it gates ~80% of the remaining roadmap), and *in
parallel* build the infra-free mirror slice + classifier improvements, which need nothing from
it.

> **Recommendation —** (1) **Founder:** start the Atlas filing this week; it's the gating pole
> and only you can clear it (record the stock-issuance/QSBS date when it closes). (2)
> **Engineering, now, no Atlas needed:** build the in-memory mirror — repo URL → shallow-clone →
> analyze → share card — and the classifier work from Finding 1. (3) **Tag every ticket
> `blocked-on-atlas` vs `buildable-now`** so the team always works the unblocked frontier and the
> downstream pile-up is visible. (4) **Time-box Atlas:** EIN/bank delays are common, so if it
> stalls, launch the in-memory mirror as a private beta on a temporary footing to keep learning
> rather than idling.

**Status (2026-06-30): the unblocked frontier was worked; Atlas is still the gate.** The
in-memory mirror is built (`packages/analyzer/src/clone.ts`, #67) — paste a public repo URL on
localhost → shallow bare/blobless clone (SSRF-allowlisted, `execFile`, bounded depth/time) →
analyze → result, no DB and no Atlas. The classifier work (Rec from Finding 1) also shipped. So
items 1–2 of this recommendation are done. **Still open and unchanged:** Atlas itself — and with
it persistence, the production deploy, the verified/bound live path, and the PostHog transport
(built as a dormant seam, `analytics.ts`). Recommendation 0 in the re-sequencing list stands as
the top action; only the founder can clear it.

## 3. Publishing AI-inference pages about non-consenting third parties is a PR/legal landmine with no consent design

The public-git bootstrap (ARCHITECTURE §8) auto-populates asserted-tier claims and SEO resolver
pages for *every public repo author, before they opt in.* Combined with the regex classifier,
you publish at indexable URLs statements like *"this code: who made it — 70% AI"* about people
who never asked to be measured, from a heuristic that's frequently wrong.

- For a **trust brand**, "MadeBy says I'm an AI coder" backlash is uniquely corrosive — it
  attacks the one asset you sell.
- Git author emails + behavioral inference is **personal data**; publishing inferences about EU
  developers carries GDPR exposure (lawful basis, right to object, accuracy duties on inferred
  data).
- The salted/HMAC private-fingerprint scheme is "in the model from the start" (ARCHITECTURE §2)
  but **absent from schema and code.** Abuse, consent, opt-out, and takedown are explicitly
  punted as "orthogonal platform policy" (ARCHITECTURE §11). That's the wrong call: for a
  public-inference product, consent/takedown is a **launch blocker**, not an afterthought.

There is a silver lining in the Atlas dependency here: public ingestion and the public index
can't go live until the providers exist (post-Atlas), so there is a genuine **window to design
consent / opt-out / takedown before the landmine is armed.** Use it — don't let the first public
ingestion ship without it.

> **Recommendation — make public, name-attached pages claim-activated; keep everything else
> aggregate.** (1) Ingest broadly, but **gate the public, indexable, name-attached AI-inference
> page behind a claim** (or an owner-connected allowlist); pre-claim, show only the neutral
> "who" (git authors, no AI-% headline). (2) The public index ships **aggregate-only** — never a
> per-individual "X is an AI coder" page. (3) Build the **salted/HMAC private-fingerprint
> scheme** now (it's specced in §2, absent in schema/code). (4) Ship a self-serve **opt-out +
> takedown endpoint** and a `privacy@` contact before launch. (5) Fold a privacy/DPA review into
> formation (ties to Finding 4).

**Status (2026-06-30): resolved in design; build correctly deferred.** ARCH §8 now carries a
consent gate (claim-activated name-attached pages, neutral pre-claim "who," aggregate-only index)
and §11 reclassifies consent/abuse/takedown from "orthogonal policy" to **launch blockers**;
COMPLIANCE adds the privacy/DPA review to formation. The **salted/HMAC fingerprint scheme and the
opt-out/takedown endpoint are still uncoded** — appropriate, since no public, indexable path is
live yet (the in-memory mirror renders on localhost, publishes nothing). Keep these on the
pre-public-launch checklist; the landmine is disarmed only as long as nothing public ships.

## 4. The "sworn" legal tier is the highest-liability surface and has no risk treatment

The sworn tier promises legally-actionable attestations, perjury exposure, court-ready export,
and write-back of court rulings (STRATEGY §2, ARCHITECTURE §11). This puts MadeBy in the
business of *collecting and hosting legal representations and publishing ranked evidence about
ownership disputes.* Unaddressed: who is the legal counterparty to a sworn claim and in what
jurisdiction; whether MadeBy is exposed as a co-defendant when a false sworn claim harms
someone; intermediary-liability / safe-harbor posture; what actually stops the "powerful actor
files false sworn claim against small creator" case the doc itself raises (§11 "residual risk")
and then mostly waves off. COMPLIANCE.md covers C-corp bookkeeping, not platform liability.
This is specced as a *wedge* ("free tier with teeth") yet it's the part most likely to generate
a lawsuit and has the least operational design.

Company formation (the Atlas moment) is the natural trigger for the platform-liability legal
scaffolding this product needs: **Terms of Service, a privacy policy, a DMCA/takedown agent, an
intermediary-liability posture, and counsel on hosting sworn attestations and publishing
inferences about third parties.** The formation runbook is thorough on *entity/tax* (C-corp,
EIN, 83(b), QSBS, franchise tax — PROVISIONING + COMPLIANCE) but **silent on product-liability
legal work.** Forming the entity without that layer leaves the highest-liability tier (sworn)
legally naked at launch; add it to the formation checklist, not after.

> **Recommendation — defer "sworn," and when you ship it, be the record-keeper, not the notary.**
> (1) **Don't launch the sworn tier.** The asserted + verified tiers carry the wedge with a
> fraction of the liability; gate sworn behind explicit counsel. (2) Add the **product-liability
> legal pack (ToS, privacy policy, AUP, DMCA-agent registration, safe-harbor posture)** to the
> formation checklist as a named deliverable. (3) When sworn does ship, structure it so the legal
> counterparty runs **claimant-to-claimant**, with MadeBy as a transparency log hosting *ordered
> evidence* — consistent with "we order, we don't adjudicate" — never as notary or judge. (4)
> Codify the **symmetric evidence-export + non-deletion** guarantees (§11) as enforced policy,
> and get counsel specifically on the "powerful actor files a false sworn claim" case.

**Status (2026-06-30): resolved.** STRATEGY §2 now explicitly defers the sworn tier until counsel
signs off and commits to the record-keeper-not-notary structure; COMPLIANCE adds the
product-liability legal pack (ToS, privacy policy, AUP, DMCA agent, safe-harbor, sworn-tier
counsel) as a named **formation deliverable**. Execution rides on the formation/legal engagement.

---

## The three founder concerns, head-on

### Concern A — "We haven't made feedback a first-class mechanic." Agree, with a sharpening.

Slightly better than feared, and worse in a different way. OPERATIONS §7.4 and §11 *do* name a
"dispute/correction queue" and frame "this estimate is wrong → claim & correct it → verified
tier" as a conversion loop. So feedback is *conceived* — but:

- **None of it is built.** No telemetry, no PostHog events, no in-product "this is wrong"
  affordance, no bug channel. The app cannot observe itself.
- **It's framed only as a conversion mechanic, not a quality flywheel** — "annoyed user upgrades
  to fix their number," not the data pipeline that improves the classifier.
- **The calibration story has no data-acquisition path.** The benchmark is 21 hand-authored
  synthetic cases that "will grow as real corpora are labeled" — but nothing describes *how* real
  labels get captured. The correction queue is exactly that missing bridge, and the two are never
  connected.
- There is **no funnel instrumentation for the number OPERATIONS calls "the single most important
  in the company"** (asserted→verified conversion). You can't improve a conversion you don't
  measure.

Conclusion: feedback should be **one mechanic doing triple duty** — user correction (UX),
labeled training/eval data (quality), and conversion signal (growth). Today it's a sentence in
an ops doc.

> **Recommendation — build the one feedback primitive that does all three.** (1) A "this is
> wrong / correct this" affordance on every analyze + resolver result. (2) Corrections land in a
> **labeled-data store wired to the classifier benchmark/calibration** — closing the eval
> data-acquisition gap (Finding 1.3). (3) The same action emits a **funnel event** so
> "correction → claim → verify" is measured; wire **PostHog for the asserted→verified funnel from
> the first live deploy** (it's already in the provider list). (4) Add a public changelog/status
> page so feedback visibly produces change — itself a trust-brand signal.

**Status (2026-06-30): built.** All four parts shipped — a correction form on every analyze
result, `feedback.ts` whose `Correction` is simultaneously the UX object, the eval label
(`correctionToLabel`, append-only JSONL store), and the funnel event; `analytics.ts` names the
asserted→verified funnel and fires from day one (PostHog transport dormant until `POSTHOG_KEY`,
which is blocked-on-Atlas — the right seam); and a `/changelog` page. Remaining: the live PostHog
wiring + the loop from captured corrections back into the benchmark land once deployed.

### Concern B — "Too much user-facing complexity." Strongly agree; it's real and pervasive.

Count what a *first-time user* must absorb to understand their own result. The resolver page
spec (ARCHITECTURE §1) presents **7 question-blocks** (who / how-sure / said-vs-made /
alone-or-contested / from-what / why / verify-yourself), over a **4-tier ladder**, across **2
independent evidence axes** (authenticity vs. origination), with **divergence flags**,
**open-conflict states**, **coverage decomposed into bound/verified/asserted/unattributed**, and
**edge tiers** (declared vs. inferred). The analyze page already leads with "asserted tier
(unverified)," "mean confidence 0.55," and a two-clause caveat — *wrapped around a single
percentage.*

The standout offender: **"authentication ≠ origination."** Intellectually correct and genuinely
important (`contention.ts` implements it as Pareto dominance — lovely engineering). But
**unteachable at a glance.** A normal user will never parse "this claim is *open* because
authenticity diverges from origination." A courtroom-grade evidence model has been built for a
product whose headline question is "who made this?" The complexity is *internally* justified and
*externally* fatal.

The founder instinct is right: internal complexity (the contention engine, carrier registry,
DAG) is fine and well-managed. The problem is it's **leaking to the surface.** The badge stays
clean (good); the resolver page is a graduate seminar. The resolver page should answer "who made
this" in one bold line, with everything else behind **progressive disclosure** — "show the
evidence," "this is contested," "verify it yourself" as opt-in, not the default wall.

> **Recommendation — make "one-line answer + progressive disclosure" a hard rule.** (1) Default
> resolver view = **"Made by X" + one tier mark**; the 7 question-blocks, coverage decomposition,
> and edge tiers collapse behind opt-in expanders. (2) **Never render the two-axis
> authentication-vs-origination model unless a conflict actually exists** — no divergence UI on
> the 99% uncontested case. (3) Keep the contention engine fully internal. (4) Set a **"concept
> budget"** for every user-facing surface (≤ ~3 new terms) and treat overflow as a design bug
> caught in review.

**Status (2026-06-30): resolved.** ARCH §1 now states progressive disclosure as a hard rule with
the ≤~3-term concept budget and "no two-axis divergence UI unless a conflict exists." The analyze
page implements it: a bold "Made by X" + a single involvement line up top, with the tier
breakdown, caveats, and badge collapsed behind a "Show the evidence" expander. Carry the same
discipline into the resolver page when it's built against real data (post-Atlas).

### Concern C — "We hedge to be honest, but shirk the mission, and hedging adds complexity." Partially agree — the distinction is everything.

There are **two different things being called hedging**, needing opposite treatments:

1. **Honesty about confidence in the *tier*** (asserted vs. bound; "estimated" labels;
   fail-safe). **Keep this — it *is* the product.** Not shirking; it's what you sell. Don't touch
   it on the proof surface.
2. **It's mis-applied to the marketing mirror.** Leading a curiosity toy with "asserted tier,
   mean confidence 0.55, absence of signal isn't proof of human authorship" is hedging in the
   wrong place. The mirror is *marketing*, not a trust claim. It should be **bold with a small
   honest footnote**, not timid with a bold disclaimer. Today the hedges are louder than the
   answer.
3. **The deeper shirk is at the strategy layer — decision-avoidance dressed as rigor.** "Hedge
   all three monetization lines" (STRATEGY §6), plus four simultaneous identities (vibe-coder ego
   toy, supply-chain/compliance tool, copyright-provenance ledger, "who-do-I-ask" reputation
   graph). Each is plausible; committing to all of them pre-traction is not a hedge, it's a
   refusal to cut. The same instinct that adds caveats to the UI adds surface area to the
   strategy. For a zero-user company, **focus is the scarce resource and the spec spends it
   freely.**

So both happen — but only the **marketing-layer** hedging and the **strategy-layer**
non-commitment are problems. The **tier-honesty is sacrosanct**; a "reduce hedging" mandate must
not erode it.

> **Recommendation — separate the two layers in the design system, and force one strategic
> commitment.** (1) **Proof/resolver surfaces:** keep full tier-honesty — non-negotiable. (2)
> **Marketing/mirror surfaces:** lead bold, name the creators confidently, demote the caveat to a
> tooltip/secondary line. (3) **Strategy:** pick **one primary buyer + one monetization motion**
> for the next 6–12 months (recommend the vibe-coder mirror → individual/team verified tier:
> warmest audience, lowest liability), and **demote the other two lines to "optionality, not
> scope."** Write it into STRATEGY as a *dated commitment*, not a standing hedge.

**Status (2026-06-30): resolved.** STRATEGY §6 now names the vibe-coder mirror → individual/team
verified tier as the **[PRIMARY]** line for the next 6–12 months and explicitly demotes the
resolver-API and supply-chain/compliance lines to **[optionality], not scope**, as a dated
commitment. The marketing-vs-proof honesty split is also reflected in §5 (bold mirror headline,
caveat demoted) — the distinction this review drew is now in the doc.

---

## What's missing (beyond what's here)

- **AI-tool integration is the real highest-leverage loop and you don't control it.** STRATEGY
  §4 admits the best channel is Claude Code / Cursor / Copilot emitting your span convention
  automatically — and the *only* fix for the §1 recall problem is that same session-log evidence.
  Both need a partnership a zero-user startup can't yet force. **The product's quality ceiling is
  gated on an integration outside your control** — a strategic single point of failure that needs
  a named contingency.
  → **Recommend:** ship the integration *to* the tools instead of waiting for them — a tiny open
  span spec + a reference emitter library + a copy-paste Claude Code/Cursor hook, so adoption
  needs no partnership. In parallel, an **opt-in CLI that reads the tools' existing local session
  logs** gets you span-level evidence today (same move as Finding 1.2). Keep the emitter
  vendor-neutral so no single vendor caps your quality.
  → **Status (2026-06-30): partially addressed.** A session-log capture script
  (`scripts/capture-session-spans.mjs`) + the vendor-neutral `.madeby` manifest read path
  (`provenance.ts`) exist, so the "ship it *to* the tools" approach is started and evidence flows
  without a partnership. The open risk is unchanged: **third-party adoption** of the capture step
  is what gates Finding 1's recall on arbitrary repos. This is the one finding where the residual
  is structural, not just unbuilt.
- **No Sybil/abuse/economic model for the free tier that fills the registry.** Squatting-
  resistance is elegantly argued at the *resolution* layer (priority is the floor), but mass
  false asserted claims, corpus poisoning, and the cost of "adjudication by display" (every
  contested page renders N claims) are unaddressed. The red-team suite covers *crypto* forgery,
  not *social/economic* abuse of the open free tier — the larger attack surface for a "let anyone
  assert anything" growth model.
  → **Recommend:** add an abuse model to the red-team scope: (a) **identity-cost on asserted
  claims** (claiming requires GitHub OAuth — raises the cost of mass squatting); (b) **bound the
  "adjudication by display" cost** — collapse low-tier/duplicate claims behind an "N other
  asserted claims" expander so a contested page never renders unboundedly; (c) **corpus-poisoning
  detection** (one actor claiming many unrelated repos → flag) wired to the §7.6 trust-&-safety
  dashboard; (d) make **abuse controls and API metering the same mechanism** (OPERATIONS already
  says this — build it once).
  → **Status (2026-06-30): resolved in design; build pending.** ARCH §11 now folds in identity-cost
  on asserted claims, bounded "adjudication by display," and corpus-poisoning detection as
  product (not "orthogonal policy"). Unbuilt, which is fine — there's no public claim/assert flow
  yet. Put it on the same pre-public-launch checklist as the consent gate (Finding 3).
- **The dogfood canary is circular.** TESTING §6 calls this repo "ground truth we know
  absolutely," but its provenance is self-asserted `Co-Authored-By: Claude` trailers you wrote —
  so the canary tests the trailer-regex against trailers you authored. A *reproducibility* check,
  not a *correctness* check.
  → **Recommend:** add an **independent ground-truth fixture set** — pre-AI-era repos
  (known-human), fully-AI-generated samples (known-AI), and third-party-hand-labeled mixed repos
  — so the canary becomes a correctness check. Keep the dogfood repo for reproducibility/
  regression, but stop treating it as accuracy ground truth.
  → **Status (2026-06-30): resolved.** TESTING §6 reclassifies the dogfood repo as
  reproducibility/regression only, and `ground-truth-v0` (`@madeby/classify`, `GROUND-TRUTH.md`)
  is the independent correctness corpus — labels rest on era / autonomous-agent account /
  documented AI builds, never the trailer the classifier reads.
- **Agentic-ops is over-engineered for the stage.** OPERATIONS §10 specs WIF, tiered capability
  brokers, kill switches, two-person rules — for a product with no prod to operate. Good ideas;
  wrong attention allocation. Effort not spent on the analyzer→GitHub gap (§2).
  → **Recommend:** descope §10 to its own "start conservative" floor — **read-only metrics +
  propose-PR** — and explicitly **park the WIF/broker/tiered-capability machinery as a
  post-traction epic** (keep the design captured, flag it clearly as future). Reallocate the
  attention to the unblocked funnel work.
  → **Status (2026-06-30): resolved.** OPERATIONS §10 now opens with a stage descope — v0 floor is
  read-only metrics + propose-PR, and the WIF/broker/tiered-capability/kill-switch machinery is
  parked as a post-traction epic with the design retained.
- **Commit-% vs. code-% conflation** (a quiet honesty gap for a trust company): the engine yields
  percent-of-commits; the badge implies percent-of-code. Different numbers; the marketing rounds
  toward the more impressive/precise one.
  → **Recommend:** a one-line copy fix with outsized honesty value — label the v0 number exactly
  as **"% of commits with AI involvement,"** never "% AI" or a code ratio. Reserve a lines/tokens
  ratio for when span evidence exists, labeled as a computed view (invariant #6).
  → **Status (2026-06-30): resolved.** The exact label "% of commits with AI involvement" is now
  used in the analyze UI and the STRATEGY/ARCH badge sections; the precise code ratio is reserved
  for the span-evidence tiers.

---

## What I'd re-sequence

*Updated 2026-06-30.* The original list is preserved with status markers; most of it shipped in
PRs #66–#77. What's left clusters into one founder task, one product risk, and a pre-launch
checklist.

- ✅ **(was 1) In-memory mirror on a stranger's public repo** — shipped (`clone.ts`, #67).
- ✅ **(was 2) Reframe the AI-detection promise** — shipped (honest headline + ground-truth
  corpus); recall residual tracked below.
- ✅ **(was 3) Feedback mechanic wired three ways** — shipped (`feedback.ts` + `analytics.ts`).
- ✅ **(was 5) Resolver/analyze page to one bold answer + progressive disclosure** — shipped on
  the analyze page; carry it to the resolver page when built on real data.
- ✅ **(was 6) Pick one monetization line** — done (PRIMARY = mirror → verified tier).
- 🟡 **(was 4) Consent/opt-out/takedown + sworn-tier liability** — *designed*, build deferred
  behind the public launch. Now a **pre-public-launch checklist** (with abuse controls, M2).

**The remaining priority order:**

0. **Drive Stripe Atlas to completion now** — unchanged and still #1. The ~days-long, founder-only
   pole that gates the bank → company card → paid providers → deploy/migration → persistence, the
   real registry, the verified/bound live path, and the PostHog transport (PROVISIONING steps
   3–6). Everything built since is dammed behind it. Only the founder can clear it.
1. **Finish the Finding 1 recall residual — still the top *product* risk, now narrower.** The
   primary moves shipped (local capture, coverage-led framing, wider signals — see the follow-up
   assessment). What remains, all buildable now with no Atlas: **(a) multi-tool capture parsers**
   (Claude Code is the only one wired — this is the biggest hole, since the viral surface is every
   AI tool); **(b) calibrate the 0.5 structural-match threshold** against ground truth, biased
   toward discard, so witnessed capture can't over-claim; **(c) hunk-level attribution** for a real
   "% of code." Until (a) lands, the surprising ego-number exists only for Claude Code owners who
   run capture.
2. **Pre-public-launch checklist (before any indexable, name-attached page ships):** ✅ salted/HMAC
   private fingerprints now built (`private-fingerprint.ts`); **still to build:** the
   permissioned-resolution wiring on top of them, self-serve opt-out/takedown + `privacy@`, the
   asserted-claim abuse controls (M2), and the product-liability legal pack landing with formation
   (Finding 4). These must be *built and live* the moment the public path turns on, not after.
3. **On Atlas close:** wire env → deploy → migrate; light up the PostHog funnel and the
   corrections-→-benchmark loop; stand up the claim/verify flow (the asserted→verified conversion
   that the whole monetization rests on).

The engineering instincts are excellent and the strategic thinking is rare — and this remediation
pass demonstrated it: the team took the critique, built the unblocked work as real tested code,
and was willing to publish a *worse-looking but honest* number (untrailered recall 0%) rather than
average it away. That is exactly the temperament a trust company needs. The original risk —
choosing *defensible and complete* over *adopted and simple* — has narrowed to two things: a
real-world errand only the founder can run (Atlas), and making the honest detector actually
*surprising* on a stranger's repo (the recall residual). Everything else is sequenced.
