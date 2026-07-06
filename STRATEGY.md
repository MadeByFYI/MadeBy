# MadeBy — Product & Go-to-Market Strategy

> **The question:** *Who made this thing?*
> MadeBy lets humans and AI answer that — verifiably — for digital content, starting with code.

This document covers positioning, the trust model, the first wedge, go-to-market, and
monetization. The technical design that follows from it is in `ARCHITECTURE.md`; how we run
it (resources, providers, dashboards) is in `OPERATIONS.md`; how we keep it trustworthy is in
`TESTING.md`. The first attempt is archived in `archive/v1/` (see its `ARCHIVE_NOTE.md`).

---

## 1. Positioning: a proof layer, with credit as the free tier

There are two different users of "who made this":

- **The skeptic** ("prove it") — a journalist, a platform, a court, a buyer. Needs rigor:
  a tamper-evident binding to the actual bytes, a verified signer, and an honest failure
  mode when proof is absent. For them, a forgeable claim is *worse* than nothing.
- **The crediter** ("who deserves the nod") — a creator, collaborator, or AI operator who
  wants attribution to travel. Needs reach and near-zero friction; social stakes, not
  adversarial ones.

These have **opposite failure tolerances**, so a product can't sit neutrally between them.

**Decision: the proof layer is the spine; credit/attribution rides on top as the free tier.**

Rationale:
- The credit/attribution space is crowded and weakly defended (every platform has bylines,
  watermarks, "made with AI" labels). Hard to build a moat there.
- The proof space is structurally hard and getting more valuable every month as generative
  content floods in. That difficulty is the moat.
- **A proof layer can always offer a cheap credit tier; a credit layer can never credibly
  retrofit proof.** Trust architecture has to be load-bearing from day one.

### The free tier is not a loss-leader — it is the distribution engine

A proof layer with an empty registry is useless; nobody queries a database with nothing in
it. The frictionless credit tier is what **seeds the corpus** — getting content and
identities into the system at volume, so that when a skeptic shows up holding an artifact,
there is something to resolve against.

> **Proof is the moat. Credit is the flywheel that fills the moat.** They are sequenced,
> not in tension. This is the answer to "the better technology loses in the market": the
> better technology wins *only* when wrapped in the lower-friction thing.

---

## 2. The trust model: an honest, labeled spectrum

Trust is never a single bit. It is a labeled ladder, and the product's job is to make the
tier legible at a glance and never let a low tier masquerade as a high one.

| Tier | What it means | Trust mechanism |
|------|---------------|-----------------|
| **Asserted** | A claim, from anyone. Discovery/credit only. | None (honor system) |
| **Sworn** | Still no cryptographic binding, but legally consequential. | Legal attestation |
| **Verified** | The signer is a known, verified party. | Verified identity |
| **Bound (proven)** | Cryptographic binding to the exact bytes. | Signature / C2PA / Sigstore |

### The legal axis is orthogonal — and it is a real wedge

A sworn legal representation is **a non-cryptographic way to raise the cost of lying.**
Cryptography binds a claim to *bytes*; a sworn attestation binds a claim to a *person who
bears consequences for it.* These are independent, and we use both:

- It gives the **free tier teeth** without cryptography (a false sworn claim is actionable).
- At the proof tier it converts "here is a cryptographic fact" into **"here is a
  legally-established claim of authorship/copyright."**

A signed, timestamped, sworn authorship record is *evidence of authorship and priority* —
useful in a dispute even when the bytes later drift. The registry quietly becomes a
**copyright-provenance ledger**, not just a badge service.

> We **order evidence; we do not assert truth.** When two parties claim the same content,
> we rank by tier, timestamp, and lineage — we do not adjudicate.

> **Defer the sworn tier (review 2026-06-29, Finding 4).** Sworn has the *least* operational design
> and the "powerful actor files a false sworn claim" case, so **we do not launch sworn until counsel
> signs off.** The wedge runs on **asserted + verified** at a fraction of the liability.
>
> **We do not host the sworn declarations (decision, 2026-07-06).** The tier's legal force comes
> from the declarant adopting standardized, **legally-signed** declaration language — not from us
> hosting it; hosting was only the liability, never the mechanism. So we **publish the template
> instrument, the user self-hosts the signed declaration in their own repo, and we detect it and
> store a pointer** (OSI/SPDX model — we are a *detector/indexer*, not a publisher of others'
> claims). The signature is a **legal** one (binds the claim to a person who bears consequences);
> a cryptographic signature is an optional add-on that further unlocks *verified*. This flips
> MadeBy from **record-keeper-hosting-evidence** to **pointer-to-self-hosted-evidence** — takedown
> is trivial and fail-safe (they delete the file → the pointer degrades to `asserted`; we held no
> copy), and counsel's scope shrinks to *our template wording + the pointer disclaimer* rather than
> a hosting regime. Mechanism: `ARCHITECTURE.md §3` (the sworn carrier). The **product-liability
> legal pack** (ToS, privacy policy, AUP, DMCA-agent registration, safe-harbor posture) remains a
> named **formation deliverable** — see `COMPLIANCE.md`.

---

## 3. The first wedge: code, and specifically vibe-coding

"Creators of all kinds" is the destination. The beachhead is **software/code**, because:

- **It's a gap the incumbents don't cover.** Going visual-first means fighting the C2PA
  Content Authenticity Initiative (Adobe, Google, camera makers, baked into hardware).
  Code has *no* incumbent provenance standard — we can define the binding.
- **Git is already content-addressed**, so the asker-pull spine and content-as-key are
  *native* (a commit SHA is a content hash). The hard part of the architecture is free here.
- **Capture-at-source is a solved mechanism** — git hooks, commit trailers, signed commits,
  CI steps. A technical audience tolerates setup and gives real feedback.
- **The human/AI question is at peak economic urgency in code right now** — licensing,
  liability, supply-chain provenance, "how much of this PR did the AI write."

### Vibe-coding is the viral surface inside code

Code has muted virality vs. creative work — *except* for vibe-coding, which is the exact
intersection of code-first + AI-native + free-tier flywheel + a culturally loud, online,
sharing-prone audience that is anxious and curious about the very question we answer:
**"how much of this did I make vs. the AI?"**

And the AI tools (Claude Code, Cursor, Copilot) already hold the session logs — so the
attestation can be *generated from the tool's own record*, not self-reported. The vibe
coder's free badge gets evidence-backed teeth for free, because the AI tool is a witness.

### Adjacent ideas: logical applications vs. detours

- **Open-source supply-chain security** — *same architecture, different question.* "Is this
  dependency really from who it claims, unmodified?" is asker-pull + content-as-key +
  verified identity + bound proof. It is **orthogonal only on the AI/not-AI axis**, not on
  the architecture. Treat it as a **downstream product** the same ledger lights up later
  (different, enterprise go-to-market) — but keep the primitives cryptographically
  load-bearing *now* so it can stand on them.
- **Wallet as identity anchor — yes, on-spine.** A public key is already the proof
  substrate (signing is public-key crypto). One key pair per producer does triple duty:
  signs content, anchors a self-sovereign identity, and can receive value.
- **Becoming a payment/compensation rail — no, fenced off.** Moving money inherits
  money-transmission/KYC/AML weight and token-speculation optics that undermine the sober
  trust positioning. We produce **the verified attribution graph with payable identities
  attached** ("this dependency is 40% authored by these three verified identities, here are
  their keys") — the input a funding protocol needs. **We are the trust layer; someone else
  moves the money.**

### Beyond code: management artifacts are the next content frontier (committed, sequenced)

"Creators of all kinds" is the destination; the **committed** next step after the code foundation is
not a new vertical but the **artifacts that manage the creation of the code** — tickets, PRs, issues,
design docs, ADRs/RFCs. Why this is the right first move beyond code:

- **Same identity space, zero new bootstrap** — they live in GitHub/GitLab/Jira/Linear: same people,
  orgs, and auth as the code wedge.
- **Authorship-rich and credit-poor**, for exactly the people code attribution erases — the PM who
  wrote the spec, the architect behind the RFC, the QA who filed the decisive bug, the designer whose
  mock drove the UI. This broadens the credit flywheel past developers and is the **on-ramp to design
  artifacts** (and the designer audience).
- **They carry the *why*.** An edge from code → its motivating ticket/design doc is the rationale
  layer code lacks — powering "who do I ask / how do I understand this," onboarding, and review.
- **Enterprise value: requirements-to-code traceability**, which regulated industries (medical,
  aerospace, finance) are *mandated* to maintain — a provenance product people must buy.

These connections are **inferred and therefore tiered** (a `Closes #123` link is high-confidence; a
semantic "implements that RFC" is low-confidence), handled by the open edge-type registry in
`ARCHITECTURE.md` §6. **Sequencing is explicit: the code-focused foundation comes first; the artifact
layer is built on top of it, not instead of it.**

> A related single-player hook: **contributor-portable, verifiable reputation** — a proof of *your*
> authorship you carry across employers (even privacy-preservingly: "I authored 60% of X" without
> revealing the content). Another selfish, no-network reason to pull work into MadeBy (cf. §4
> cold-start), and the DAG view that most protects the contributor (`ARCHITECTURE.md` §6).

---

## 4. Go-to-market: the architecture *is* the distribution

A zero-budget, earliest-stage startup needs the product to market itself. Several design
choices double as the distribution mechanism:

1. **The README/coverage badge — the classic dev-tool loop.** A badge in a README is seen
   by every visitor and links back. The *artifact is the ad* (how Codecov, Travis spread).
2. **Public resolver pages — an SEO / public-good engine.** Because we bootstrap from public
   git, "who wrote this library/function" pages exist and are indexable *before we have a
   single user.* The bootstrap decision is also a content-marketing engine.
3. **AI-tool integration — the highest-leverage loop.** If the span convention is something
   Claude Code / Cursor / Copilot emit automatically, we acquire the *output of their entire
   user base* as a byproduct. This is why the **open-standard** posture matters commercially:
   a standard gets adopted by integration; a proprietary API requires a partnership we have
   no leverage to win yet.

### The first buildable wedge: "analyze your existing git history"

A free analyzer that reads **existing** git history and shows your human-vs-AI authorship
breakdown — using data that already exists (`Co-Authored-By` trailers are already in
millions of commits, plus git blame + heuristics). "Connect your GitHub, see how much of
your code is AI-written," producing a shareable report + badge.

- **No behavior change** — it works on history people already have. Value first; the
  hardest part (doing something at creation time) is deferred to the upgrade path.
- **Inherently shareable** — the breakdown is an ego-number people *want* to post.
- **Turns the bootstrap asset into acquisition** — "here's *your* breakdown, claim your page."

> **Build-order consequence:** build the **analyzer + resolver (read side) first**, and make
> the producer/signing flow the *upgrade*. v1 built producer-push first; GTM inverts this.

The upgrade ladder doubles as the trust ladder: free asserted breakdown → "verify your
identity & sign your commits" → verified/bound badge. Converting asserted→verified is what
fills the registry with *real* identities, which is what makes the proof core valuable.

### Cold-start: user #1 is using a mirror, not a provenance tool

This is where products with a beautiful flywheel usually die, so it gets first-class
treatment.

**The fatal trap:** the flywheel (badges, registry, network) is *collective* value — useful
when many participate. But user #1 participates in a network of one. If their payoff depends
on the network existing, the flywheel never starts. A badge nobody recognizes, in a registry
nobody queries, is the value of being first to a network product: zero.

So the real question is not "how do we start the flywheel" but: **what complete, selfish,
single-player payoff does user #1 get with zero network?**

**The answer:** on day one this is a **curiosity mirror, not a provenance tool.** The thing
with standalone, network-free value right now is the answer to a question people are already
itching to ask about themselves — *"how much of my code is actually AI?"* — delivered to one
person in 30 seconds, needing no one else. This is the **Spotify Wrapped pattern** (also
GitHub year-in-review, WakaTime, Grammarly's original "check your writing"): a single-player
mirror whose result is interesting enough about *you* that sharing happens as a byproduct.

> **Principle: decouple the first-use motivation (selfish, single-player, instant) from the
> system's eventual value (collective trust network).** Products that make user #1 care about
> the network die; products that hand user #1 a complete selfish payoff and treat the network
> as a byproduct spin up.

Corollary, stated honestly: **the badge is a *second-order* motivator, not the cold-start
hook.** Early on nobody recognizes it; the *insight* is what's valuable on day one. Don't
expect the badge itself to pull the first user.

**Why they'd do it the first time ever:** zero cost / zero setup / instant; the question is at
**peak cultural salience right now** (a now-or-never timing window); and the result is
*surprising* (people don't know their ratio) and *shareable* (an ego-number).

**The full cold-start sequence** — note the first three steps owe nothing to provenance,
trust, or network:

1. **Aggregate study + live index** from public-git data → newsworthy, zero users needed,
   positions us as the authority → drives the first traffic.
2. **The selfish mirror** (analyze *your* repo) → user #1's first action, complete payoff
   with no network.
3. **The shareable result** → ego-number → dev-to-dev viral loop → more first-timers.
4. **The upgrade** (claim page, verify, badge) → *now* the registry fills with real
   identities and producer-push begins — **only here does the provenance flywheel turn.**

### The live index: "State of AI in Open Source"

Not a one-off study — a **constantly-updated page**, powered by continuous public-git
ingestion, reporting how much of open source is AI-written: a headline global number, trends
over time, and breakdowns by language/ecosystem. (Technical home: `ARCHITECTURE.md` §8.)

Why it's a strategic asset, not just marketing:
- **Authority moat.** Being *the* canonical, citable source for "how much of open source is
  AI" is a brand position competitors can't easily take — it compounds with every update.
- **Evergreen PR + SEO.** A live, updating number is re-citable forever (press, talks,
  papers) where a one-off study decays. It is returning-traffic, not a spike.
- **Top of the funnel.** The natural CTA from the global number is **"check your own repo,"**
  feeding the curiosity mirror above.
- **Same engine → an enterprise product.** The index is corpus-agnostic. Pointed at public
  git it's the free authority asset; pointed at **an org's private repos** it's the internal
  provenance dashboard enterprises want — "how much of *our* codebase is AI-written, what's
  our provenance coverage, which dependencies are unattributed." The public index is the
  marketing instance; the org index is the **paid** instance (the supply-chain/compliance
  monetization line). Build the aggregation engine once. (Technical: `ARCHITECTURE.md` §8.)

**Honesty requirement (non-negotiable for us specifically):** the global number is an
*estimate* — asserted-tier, heuristic. We are a trust company, so **our own headline metric
must model the tier-honesty we sell**: label it as estimated, publish the methodology, and
show confidence. A provenance authority that overstates its own confidence is self-refuting.

### Regulatory tailwind

The EU AI Act and similar disclosure rules convert "nice-to-have provenance" into "must
demonstrate provenance." That makes AI labs both a **distribution channel** and a potential
**customer** (their tools' outputs must be disclosably attributable). Design the standard to
fit "compliance-grade disclosure" — that buyer has a budget and a deadline.

---

## 5. The badge: the growth engine in ~30 characters

The badge is the entire growth engine compressed into a README line. Every character must
be delightful, informative, viral, and branded.

### The domain is a sentence-stem — lean on it

`madeby.fyi` is not just a short URL; it is the first half of the sentence the badge
completes, **and** a valid, visitable domain (both jobs at once):

```
[ madeby.fyi ][ 🧑 62% · 🤖 38% ✓ ]
```

Reads as *"made by [fyi]: 62% human, 38% AI."* The `.fyi` carries the "for your
information / here's the disclosure" tone for free. The left capsule (the domain) is the
constant that travels and builds brand recall; the right capsule is the personal hook.

### Non-negotiable framing rule: celebrate transparency, stay neutral on the ratio

The thing rewarded is **that you disclosed and verified** — *not* that you used less AI. A
90%-AI verified repo wears its badge as proudly as a 90%-human one; both told the truth,
verifiably. This is essential *because of the wedge*: vibe-coders are heavy AI users and
proud of it. If the badge implies "more human = better," we alienate our entire viral
surface. All prestige lives in the **tier**, never in the ratio. (This is also consistent
with "order evidence, don't assert truth.")

### The tier aesthetic gradient *is* the conversion funnel

```
[ madeby.fyi ][ 🧑 62% · 🤖 38% · estimated ]   ← asserted: neutral/slate, complete, proud
[ madeby.fyi ][ 🧑 62% · 🤖 38% ✓ ]             ← verified: brand color, earned check
[ madeby.fyi ][ 🧑 62% · 🤖 38% (seal) ]        ← proven: a distinctive, ownable MadeBy mark
```

- **Default content is mix-led**: the human/AI ratio is the headline (ego-shareable), with
  a tier/coverage mark alongside (keeps the broader proof-layer identity open, rather than
  boxing us into "the AI-percentage thing").

> **v0 honesty correction (review 2026-06-29, Findings 1 + commit-%-vs-code-%).** Until span/
> session-log evidence exists, our detector measures **commit *involvement* (trailer presence)**,
> not a code ratio — and inline autocomplete emits no trailer, so heavy AI users can read as
> ~100% human. A `🧑 62% · 🤖 38%` *code* split overclaims a precision we can't compute — the one
> sin the doctrine forbids. **So at v0 the mirror/badge headline is named AI collaborators + a
> provenance-coverage number, and any ratio is labeled exactly "% of commits with AI
> involvement" — never "% AI" or a code split.** The precise lines/tokens mix-led ratio is
> *reserved for the tiers where span evidence actually exists* (invariant #6). For a curiosity
> mirror that systematically under-detects, **under-claiming is the fatal bug**: reframe to what
> the evidence supports rather than ship a boring, wrong number. (Tracked: classifier-recall +
> session-log evidence ticket.)
- **The gap between tiers lives in the *trust mark*, not in aesthetic quality.** Asserted is
  never crippled (it must seed virally); verified adds a desirable, earned mark — the
  verified-checkmark model. Moderate gap: pronounced in *meaning*, subtle in *aesthetics*.
- **The honest qualifier is the upsell.** "estimated / self-reported" is required for
  integrity *and* is exactly what creates the itch to upgrade and earn the `✓`. The
  integrity label and the growth mechanism are the same five characters.
- **Proven-tier mark:** not a stock padlock (reads "SSL," cold, not ours) — a distinctive,
  ownable MadeBy mark, recognizable the way a verified check is. (Design detail, parked.)

### Genuineness must be checkable — the badge is a pointer, never proof

A rendered badge is just an image, and any image can be faked. So:

1. The image is **served live from `madeby.fyi`** (e.g. `madeby.fyi/b/<owner>/<repo>.svg`) —
   numbers are rendered from real data, not a forgeable static file.
2. The badge is **always wrapped in a link to the authoritative resolver page**
   (`[![madeby.fyi](.../b/owner/repo.svg)](https://madeby.fyi/owner/repo)`).
3. **Genuineness = follow the link.** The resolver page is the single source of truth.
   Forgery is self-defeating: a faked `✓` image, once clicked, lands on the real page
   showing the true (likely unclaimed) status.

> Honest limit: a casual viewer can't authenticate pixels by eye. Checkability is "one click
> to the authoritative page" — which is the asker-pull spine doing its job. **Never market
> the image itself as proof.**

### Two principles the badge depends on (mission guardrails)

These surfaced from dogfooding the analyzer on our own repo and are easy to violate:

> **Altitude — the badge is a headline + pointer; the answer lives on the page.** The badge
> carries a glanceable *facet* (the mix, or a tier mark) and links to the full answer. Rich,
> name-every-creator attribution lives on the resolver page, never on the badge — so the badge
> stays succinct and viral while the answer stays complete. When data is too coarse for a
> precise headline, the badge degrades to the **tier** (`madeby.fyi · estimated`), still short.

> **Name the creator; put the uncertainty in the tier — never abdicate the question.** The
> product exists to answer "who made this." "No signal detected" is honest but is a non-answer,
> so we don't ship it: we always name the contributors (human operators + AI models) and
> express how-sure-we-are through the *tier* and a caveat, not by refusing to name. (Coarse
> now, precise later, is fine — but never silent.)

Note: QR codes (central in v1) made sense for physical/visual content. For code, the
markdown shield + social/OG share card + clickable link are the surfaces. QR is retired as
the centerpiece here (revisit for the eventual creative/visual expansion).

### The "prove-me-wrong" CTA — provocation-to-correct (decision, 2026-07-01)

The `RESEARCH-lowfriction-accuracy.md` study concluded *routing, not attribution* — and left the
coverage CTA neutral ("Y% unattributed; run capture"). **Decision: make the CTA a provocation.**
People correct a statement they find wrong about themselves faster than they act on a neutral
prompt (Cunningham's Law). This turns the mirror's known weakness — the honest *under-count* of the
untrailered blind spot — into its engagement engine, and the correction **is** the asserted→verified
conversion action.

**The one rule that keeps it out of court and on-doctrine: the provocation always leans to the
*under-claim*, never an AI accusation.** Lead with what we can prove and dare the rest:

> *"By what we can see, this is **{provableAI}% provably AI-assisted** — past that we honestly can't
> tell either way. Think that's wrong? Prove us wrong — or remove all doubt as to your human
> authorship. **Either way: `npx madeby prove`.**"*

**The provocation is symmetric — and that is the point.** The same command serves two opposite
motivations, so it can't be read as pushing a verdict either way:
- the **AI-proud** vibe-coder, wanting credit for the AI's share we can't yet see, runs it to prove it;
- the **human-proud** author, wanting no ambiguity, runs it to *clear the doubt* and stand behind
  their own work.
Both roads are the same asserted→verified conversion action. Framing the CTA as *resolve the doubt*
(not *disprove an accusation*) is what makes it land as neutral — the tool arbitrates, it doesn't
allege — which is exactly the honesty posture, not a compromise of it.

**The two defaults — and why we only lean in one of them (decision, 2026-07-06).** Pressed on "why
is *human* the safe default when we can't tell — why not *AI*?", the answer is that we conflated two
different defaults, and only one is defensible:

1. **The tier/verification default is `unknown`/`asserted` — direction-neutral, not "human."** This
   is the real fail-safe (invariant #5: never *falsely-verified*). It asserts no direction at all.
2. **The narrative default must also be *unknown*, not "human."** Earlier copy ("the rest reads
   human") quietly promoted *absence of an AI signal* into a *human claim* — the mild form of the
   very sin we forbid. Fixed: past what we can prove, we say **"can't tell either way"**, never
   "reads human."

So we do **not** default to a substantive authorship claim in either direction. But when a *lean* is
unavoidable, human-leaning is correct — and **not because human is more likely** (for vibe-coders in
2026 the base rate favors AI; as a *prediction* human is the wrong bet, and under-counting is the
"fatal bug", §4). The lean is justified on three grounds that are about *claim-discipline and harm*,
not likelihood:

- **Evidence asymmetry.** A commit carries a named author/committer — human authorship is *attested*
  (asserted tier), on the record. Untrailered AI has **zero carrier** in our view. Defaulting to
  "AI" would assert a subject we have no evidence for — an invariant #1 violation ("evidence, not
  guessing"), not a safer guess. Fail-safe means *assert no more than we can see*, not *guess the
  likeliest truth*.
- **Cost asymmetry beats the base rate.** A false-AI call harms a *named person* (dignity + the §7
  non-native-English 61.3%-FP defamation landmine); a false-human call over-credits *no identifiable
  victim*. When error costs are asymmetric you minimize expected *cost*, not error *rate* — which is
  the right objective for a trust brand even when the odds favor AI.
- **Never tax the honest state.** An AI-leaning default would penalize non-disclosure — the opposite
  of the participation we're trying to grow.

- ❌ Never "this appears **AI-written**." A hedged AI accusation is still the cardinal sin (the
  `TESTING.md §2` over-claim; the §7 non-native-English 61.3%-FP landmine) and "appears" is weak
  legal cover.
- ❌ Never "the rest **reads human**." Absence of an AI signal is *unknown*, not human — say "can't
  tell either way."
- ✅ "**Provably** AI in X%; past that, unverified either way" is *literally true* (a statement about
  our **visibility**, not about them — truth defense + honesty moat intact) and **self-directed** (a
  dare to the repo owner who can act).
- **The neutral direction is the engaging one:** the AI-proud want the credit we can't yet see; the
  human-proud want to settle it. The provocation is strongest exactly where it's libel-proof —
  because unresolved doubt, not an accusation, is what pulls both.

**Guardrails (enforced):** every line literally true (about our signal, never a claim about the
person); self-directed to the owner; **consent-gated for third parties** (no published, indexable
over-claims — ARCH §8); and in scope for the ToS/counsel review (a formation deliverable,
`COMPLIANCE.md`). This is **framing/copy — routing, not a detector** (no doctrine change).

**The command is `prove`** (`npx madeby prove`; alt considered: `receipts`) — the verb is the
motivation, and zero-install `npx` is the frictionless path the study named as the real flywheel
bet. It runs the `capture --local` engine (`capture-local.ts`). **Launch prerequisite:** the `npx`
package must exist before the mirror is public — you cannot publish a CTA to a command that 404s
(itself a trust-brand tell). Until then the CTA is staged on the localhost mirror.

**Consequence — the public draw is a coverage metric, not an "AI%" (decision, 2026-07-06).** Once
the default is *unknown* rather than *human*, we lose the ability to publish an honest site-wide
"X% of code is AI" headline — and that is correct, because that number was never viable for two
independent reasons: (a) with ~0% untrailered recall (`GROUND-TRUTH.md`) the honest aggregate is
dominated by our blind spot — the truthful number is wrong-low, the impressive number is dishonest,
and even the invariant-#6-compliant labeled version is misleading-by-omission; (b) an AI% treats
"unknown" as a denominator we score, which *taxes the honest state* we're trying to grow. **The draw
is instead a provenance-coverage / transparency metric** — "X% of this repo has *verifiable*
provenance" — which is honest, aggregatable, *rises* as the network adopts, and whose gap **is** the
CTA (same curiosity/competition pull, pointed at a number that rewards participation instead of one
we can't compute). This is `RESEARCH`'s *routing-not-attribution* and this section's *celebrate
transparency, neutral on ratio*, applied to the growth surface. **Named tradeoff:** "60% of code is
AI" is a punchier hook than "raise your coverage" — we are trading a viral-but-false draw for a
slower-but-true one, the same honesty-as-moat bet the rest of the strategy makes.

---

## 6. Monetization

Monetization is downstream of momentum, but it shapes the core design, so the rules are set
now.

> **Focus commitment (review 2026-06-29, Concern C; dated through ~2026).** "Hedge all three"
> at zero users is decision-avoidance dressed as rigor — focus is the scarce resource. **Primary
> line for the next 6–12 months: the vibe-coder mirror → individual/team *verified* tier** (the
> warmest audience and the *lowest-liability* path — it pairs with deferring the sworn tier,
> below). The other two lines (resolver-API-at-scale, supply-chain/compliance) are **optionality,
> not scope** — kept in the architecture, not on the build plan. Revisit at traction.

### Viable lines — primary vs. optionality

- **[PRIMARY] Trust premium (verification-as-a-service):** free to assert; pay for org/team
  accounts, verified-identity, signing infrastructure, the verified badge. Monetizes the proof
  core. This is the line we build toward now (vibe-coder mirror → verified tier).
- **[optionality] Asker-side at scale (the resolver API):** free/metered for casual asks;
  platforms, marketplaces, moderation systems, and AI labs pay to query provenance at volume.
  Likely the largest TAM long-term; monetizes the asker-pull spine. Kept in architecture, not scope.
- **[optionality] Supply-chain / compliance (CI gating, SBOM, coverage gates):** enterprises pay
  to gate releases and satisfy disclosure rules. The downstream product the same ledger enables.

### Ruled out (corrosive to a trust instrument)

- **Compensation/payment rail** — regulatory weight + speculation optics; we are not the bank.
- **Selling provenance data / ads** — a trust instrument that sells its data is no longer
  trusted.
- **Developer-surveillance / individual productivity scoring** — the DAG could be turned into a
  per-engineer ranking weapon; we refuse it. Corrosive to a fair-credit instrument, Goodhart-prone,
  and off-brand. We ship self-directed individual insight + team/aggregate health signals, never a
  per-person score (`ARCHITECTURE.md` §6 guardrail).

### The insight that feeds back into design

> **The trust tiers ARE the pricing tiers.** asserted → verified → bound is simultaneously
> the honesty ladder and the free → paid → enterprise ladder. The value gradient and the
> price gradient are the same axis — so we never choose between honesty and revenue.

Hard rule that follows: **the act of attribution stays free forever** (it is the flywheel;
charging for it kills momentum). We charge for *trust* and for *asking at scale*.

Second consequence: the **resolver API is a first-class, productized, SLA-backed surface**,
not an afterthought — metering, rate limits, and bulk designed from the start (generous free
asks to feed the SEO/public-good loop; metered volume to capture enterprise value). This
re-confirms asker-pull as the spine on business grounds.

---

## 7. The spine, in one place

1. Proof core; credit + legal as the seeded free tier (flywheel fills the moat).
2. Asker-pull as the architectural spine, seeded by producer-push + public-git bootstrap.
3. Ride C2PA (media) / Sigstore-SLSA (code); own identity + resolver + legal everywhere.
4. Code-first, vibe-coding as the viral surface; supply-chain + wallet-identity downstream;
   never the bank. Management artifacts (tickets/PRs/design docs) are the committed next content
   frontier, sequenced *after* the code foundation; the DAG is read as credit / "who to ask" /
   portable reputation — never as individual surveillance.
5. Hash = join key, not trust; multi-resolution fingerprints; two-hash invariant.
6. Commit/release atomic unit, span-compatible; semantic attestation standard + swappable
   carrier registry + canonical signing + graceful unknown-carrier degradation.
7. Composable claims → provenance DAG; two edge types (part-of / derived-from); "provenance
   coverage" as the headline metric; pinned-immutable vs. living-mutable.
8. GTM = the architecture; first wedge is the analyze-existing-git-history tool; trust tiers
   ARE pricing tiers; hedge all three monetization lines; rule out data-sale/ads.
   Cold-start: user #1 gets a *curiosity mirror* (selfish, single-player, no network) — the
   network is the byproduct. A live **"State of AI in Open Source" index** is the authority
   asset and top of funnel; the same engine pointed at private repos is the enterprise
   dashboard. No automated unsolicited PRs — invited automation (Dependabot model) only.
9. The badge: literal `madeby.fyi` domain as sentence-stem; live-served + always linked
   (pointer, never proof); mix-led default; moderate gap located in the trust mark; honest
   qualifier doubles as the upsell.

---

## 8. Customer discovery (dated learnings)

A running log of what real evaluation teaches us. Kept here so one conversation becomes a durable
strategic input, not a lost Slack thread. Findings are evidence about the *market*, not the code
(the code state lives in `REVIEW.md` / the backlog).

### v0 — 2026-06-30 · n=1, experienced open-source developer (prospective user)

Source: `customer_development.md` (a prospective user evaluating the specs + in-progress code).
**Sample caveat, load-bearing:** n=1, and the persona is an **OSS developer, not the core
vibe-coder** the GTM targets. Directional, not representative — treat as a hypothesis check, not a
verdict.

**Validated — the honesty *is* the moat, and it lands with users.** Unprompted, the evaluator named
the intellectual honesty (publishing untrailered-recall 0% as the headline; the fail-safe "never
over-claim about a human"; the executable verifier) as *"the most persuasive thing here"* and
*"I respect this more than most funded provenance projects."* This is the strongest confirmation of
our central bet: for a trust company, modeling the tier-honesty we sell is the differentiator. **Do
not trade it away for a flashier number.**

**Confirmed risk — friction sits exactly on the flywheel's ignition point.** The verdict was a
*soft no to adopt today*, for one root reason: **the low-friction path (the web mirror) is
inaccurate for the target user, and the accurate path (`capture --local`) is high-friction and
today Claude-Code-only.** The curiosity-mirror ego-number — the thing meant to spread — is weakest
for the heaviest AI users (inline-autocomplete vibe-coders leave no trailer). This is the §4
cold-start trap seen from the user side.

**User-validated roadmap ("what would flip me to yes"):** (a) a **second tool parser** (Cursor or
Copilot) so the witnessed path isn't Claude-Code-only; (b) **lead with coverage + make
`capture --local` the first-contact CTA** — turn the blind spot into the upgrade prompt (largely
shipped, #79/#87); (c) a **live resolver + one end-to-end verified badge** so there's something real
to click through to. This is independent confirmation that the existing plan is aimed right — it's
the same three levers, now with a user's priority order.

**New implication — friction, not just accuracy, is the conversion variable.** Reducing
`capture --local` to a true one-liner (`npx`, no clone/build) is a first-class GTM lever, not a
packaging nicety: the coverage CTA only converts if the accurate path is trivial to run.

**What this changes:** nothing in the primary strategy (§3/§6) — it *confirms* mirror → verified
tier and the capture-led accuracy path. It sharpens two priorities: **frictionless capture** rises
from "nice" to a conversion blocker, and **the next discovery round must target actual vibe-coders**
(n>1, the buying persona), ideally sourcing their Cursor/Copilot logs — the same input that unblocks
the second parser. The remaining gaps the evaluator hit (second parser, live resolver, paid tier)
are the known **sample-** and **Atlas-** gates, now market-validated as the things that matter.
