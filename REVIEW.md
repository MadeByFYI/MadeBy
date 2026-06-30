# MadeBy — Architecture / Product / GTM Pressure-Test

> An outside-in review by a senior architect lens (systems + product + GTM). Scope was
> deliberately broad: not just "is the code here good," but "what is weak, and what is
> *missing*." Strengths are noted briefly; the body is weaknesses, by request. Findings
> reference files/sections so they stay checkable.
>
> Reviewed: the four spec docs (`STRATEGY`/`ARCHITECTURE`/`OPERATIONS`/`TESTING`), `VISION`,
> the supporting docs, all six packages, and `apps/web`. Snapshot date: 2026-06-29.
> Amended 2026-06-29 to account for the Stripe Atlas provisioning dependency (revises
> Finding 2 and the re-sequencing list). Each weakness now carries an inline
> **Recommendation** block; the closing **"What I'd re-sequence"** list is the cross-cutting
> priority order over those recommendations.

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
- **The dogfood canary is circular.** TESTING §6 calls this repo "ground truth we know
  absolutely," but its provenance is self-asserted `Co-Authored-By: Claude` trailers you wrote —
  so the canary tests the trailer-regex against trailers you authored. A *reproducibility* check,
  not a *correctness* check.
  → **Recommend:** add an **independent ground-truth fixture set** — pre-AI-era repos
  (known-human), fully-AI-generated samples (known-AI), and third-party-hand-labeled mixed repos
  — so the canary becomes a correctness check. Keep the dogfood repo for reproducibility/
  regression, but stop treating it as accuracy ground truth.
- **Agentic-ops is over-engineered for the stage.** OPERATIONS §10 specs WIF, tiered capability
  brokers, kill switches, two-person rules — for a product with no prod to operate. Good ideas;
  wrong attention allocation. Effort not spent on the analyzer→GitHub gap (§2).
  → **Recommend:** descope §10 to its own "start conservative" floor — **read-only metrics +
  propose-PR** — and explicitly **park the WIF/broker/tiered-capability machinery as a
  post-traction epic** (keep the design captured, flag it clearly as future). Reallocate the
  attention to the unblocked funnel work.
- **Commit-% vs. code-% conflation** (a quiet honesty gap for a trust company): the engine yields
  percent-of-commits; the badge implies percent-of-code. Different numbers; the marketing rounds
  toward the more impressive/precise one.
  → **Recommend:** a one-line copy fix with outsized honesty value — label the v0 number exactly
  as **"% of commits with AI involvement,"** never "% AI" or a code ratio. Reserve a lines/tokens
  ratio for when span evidence exists, labeled as a computed view (invariant #6).

---

## What I'd re-sequence

The inline **Recommendation** blocks above say *how* to fix each weakness; this list is the
*order* to do them in across the whole review.

0. **Drive Stripe Atlas to completion now** — it's the ~days-long, founder-only human pole that
   gates the bank → company card → all paid providers → deploy/migration → ingestion, the real
   registry, and the verified/bound tier (PROVISIONING steps 3–6). Nothing infra-dependent
   downstream ships until it closes. This is the top risk, and only the founder can clear it.
1. **In parallel (needs no Atlas): make the mirror work on a stranger's *public* repo
   in-memory** — accept a repo URL → shallow-clone → analyze → share card, no DB required
   (OPERATIONS §3's "nearly stateless" mirror). This is the acquisition action and it's
   buildable today; the production GitHub App + persistence layer follow once Atlas lands.
2. **Fix or reframe the AI-detection promise (needs no Atlas).** Either raise recall fast
   (ingest diff-level signals, not just trailers) *or* honestly reposition the headline away
   from a precise "% AI" to what the trailer signal can support — so you stop shipping a number
   more precise than the evidence.
3. **Build the feedback mechanic once, wired three ways** (correction UX → eval labels →
   conversion event), and instrument the asserted→verified funnel before anything else.
4. **Design consent/opt-out/takedown for third-party public pages, and a liability treatment for
   the sworn tier,** before either ships publicly.
5. **Cut the resolver page to one bold answer + progressive disclosure.** Keep the
   contention/origination machinery internal.
6. **Pick one monetization line to build toward;** let the other two stay as optionality in
   prose, not in scope.

The engineering instincts are excellent and the strategic thinking is rare. The risk is not that
any single piece is wrong — it's that the project keeps choosing *defensible and complete* over
*adopted and simple*, and a provenance utility with no users in the registry is, by its own
admission (STRATEGY §1), worth zero.
