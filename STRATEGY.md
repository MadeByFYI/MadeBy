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

### Agent-native and plugin-symmetric: the platform others' AIs extend (positioning, 2026-08-11)

Two commitments that reframe *what MadeBy is* (full mechanics in `ARCHITECTURE.md §12`):

- **The primary operator is an AI.** The agents writing today's code are the ones that should
  disclose it and the ones that can adopt provenance tooling at machine speed. So every surface is
  built for **no-human-in-the-loop** use — an MCP client, machine-readable contracts, zero-choice
  defaults. Human UIs remain, as the *secondary* surface.
- **Symmetric plugins: anything we'd build first-party, a third party (or their AI) can build.** Host
  adapters (so we ride *any* forge — GitHub, Azure DevOps, GitLab, …, not just GitHub), carriers,
  anchors, recognizers, lenses — all through one published contract; our built-ins are just the
  reference impls.

We own the **standard, registry, default gravity, identity/resolver, and legal layer — not the
adapters.** The moat compounds: an open, agent-authorable ecosystem grows coverage faster than we
could, while the derived data still concentrates at the hosted resolution/grant layer (§6).
**Guardrail:** the extension contract enforces the cardinal sins as hard limits
(disclosure-not-detection, no per-person score, point-don't-host) — openness never buys an escape
from the doctrine.

### Provenance as context: the record serves the agents, too (positioning, 2026-08-12)

The agent-native block above is agents *operating* MadeBy. This is the other half: agents
**consuming** its output. MadeBy's provenance record is not only a human-facing audit trail — it is
**machine-readable context an agent reads**. When an AI returns to code it (or another model) wrote,
the disclosed provenance tells it what it is touching: **human decisions made on purpose** (preserve,
tread carefully) vs. **AI-scaffolded work and the tool/model behind it** (and, when captured via
`madeby ai`, the session). That reframes MadeBy from a disclosure/compliance gate into **infrastructure
that makes human+AI collaboration legible over time** — a bigger, more defensible story than the gate
alone.

- **Real today, not aspirational.** The record is already machine-readable via the MCP `who` tool
  and committed `.madeby/spans` (tool + model + session). An agent reads provenance the same way it
  reads the code. The human/AI distinction is *decision-relevant* context (correct agent behavior
  differs), not decoration.
- **Stays disclosure-not-detection.** The agent reads what was disclosed; it never guesses. We
  provide the record + the read tools — what an agent does with the context is the agent's; never
  over-claim we improve a model's output.
- **It compounds.** The more of a codebase AI writes, the *more* valuable an honest trail becomes —
  coordination between agents, trust/tier calibration, and provenance hygiene against AI unknowingly
  building on unmarked AI. And it is a **single-player** benefit: a producer's own future agent
  sessions are better-grounded on their own record, no network required — disclosure as leverage, not
  a tax.
- **The line:** *transparency isn't anti-AI — it's what lets people and agents build on each other's
  work with confidence.* Pro-transparency, not anti-AI.

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

### What MadeBy *is*: the substrate-agnostic non-repudiation layer (positioning, 2026-08-10)

Sharpening what the protocol reframe (`§3`) makes us. **We do not own the substrates — identity,
cryptography, the ledger, or storage — and we should never try.** Those are being won by others
(Sigstore/Fulcio for identity, Rekor and RFC-3161 TSAs for signature transparency, GitHub for the
PR surface). Competing there is a losing bet; *consuming* them is the winning one.

**What we own is the layer above: non-repudiation of the provenance *claim*.** MadeBy defines the
canonical, carrier-independent claim (invariant #2), binds it non-repudiably to *whatever* identity
signed it and anchors it to *whatever* ledger(s) witnessed it, and — at the sworn tier — gives it
**legal** consequence. The claim standard, the anchoring/verification protocol, and the legal layer
are ours; the identity, the crypto, and the ledger are borrowed. This is why *"bring your own
identity, bring your own ledger"* is not a limitation but the whole posture: it is the technical
expression of the **independent honest broker** — a role only a party that sells *neither the AI,
nor the identity, nor the ledger* can credibly hold.

**Non-repudiation is an orthogonal axis** (like the legal axis above): *authentication* (who + bytes,
asserted→bound) is one dimension; *non-repudiation* (durably, timestamped, on the record and hard to
deny — unanchored → multi-anchored → legally-recognized) is the second. MadeBy owns the second.

**The moat is therefore trust, not lock-in** — and we should say so plainly. It is **not**
verification-gatekeeping (verification is open and offline — "don't trust us, verify" is a feature,
never a wall). It is three un-forkable things: (1) **recognition** of the standard/verifier (CA-root
/ DocuSign-admissibility shaped); (2) the **legal non-repudiation** layer (substrate-independent,
uniquely ours — Sigstore does crypto non-repudiation of software; nobody does legally-consequential
non-repudiation of authorship); (3) the **resolution network** (the trusted place askers resolve
"who made this" across all anchored claims — the piece with real network effects, and the one still
under scrutiny). Thinner than a platform, slower to build (trust and legal recognition only
compound), but defensible in a way code and hosted data are not.

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

A free analyzer that reads **existing** git history — using data that already exists
(`Co-Authored-By` trailers are already in millions of commits, plus signed commits, AI-tool
configs, `.madeby` manifests) — producing a shareable report + badge. **(Reframed 2026-07-06,
below: the headline is a *Disclosure Score*, not an AI ratio — the AI-% framing gives the wrong
answer to inline-AI users. Read the reframe subsection before this one.)**

- **No behavior change** — it works on history people already have. Value first; the
  hardest part (doing something at creation time) is deferred to the upgrade path.
- **Inherently shareable** — the breakdown is an ego-number people *want* to post.
- **Turns the bootstrap asset into acquisition** — "here's *your* breakdown, claim your page."

> **Build-order consequence:** build the **analyzer + resolver (read side) first**, and make
> the producer/signing flow the *upgrade*. v1 built producer-push first; GTM inverts this.

The upgrade ladder doubles as the trust ladder: free asserted breakdown → "verify your
identity & sign your commits" → verified/bound badge. Converting asserted→verified is what
fills the registry with *real* identities, which is what makes the proof core valuable.

### Reframe: the mirror measures *disclosure*, not an AI ratio (decision, 2026-07-06)

**The wrong-answer problem.** The wedge as first framed ("how much of your code is AI") gives the
*wrong answer to its exact target user*: for heavy inline-AI users (Copilot/Cursor tab-completion,
stripped/squashed trailers) there is no signal, so a trailer/metadata mirror reports ~100% human —
false, and false for the very people the wedge is courting. `RESEARCH-lowfriction-accuracy.md`
establishes we **cannot** fix this by detecting harder: no zero-shot method holds ≤1–2% false-
positives at useful recall on real, mixed-language, short-fragment human code. "Give the correct
AI% at zero network" is a bet against our own research.

**The fix — change the question, not the detector.** The bug is that we render *absence of a
signal* as a *content claim* ("human"). So we stop selling an AI ratio and sell **disclosure /
verifiability completeness** — a question we can *always* answer correctly at zero network:

> Not *"how much of this is AI"* → **"how verifiably is this code's origin disclosed?"**

The mirror's headline becomes a **Disclosure Score**: the share of the code carrying a verifiable
origin signal (trailer, signed commit, AI-tool config, `@generated`, `.madeby` manifest,
declaration), tier distribution surfaced, the remainder labeled **"undisclosed"** — never "human."
"Undisclosed" is the *correct* answer for the blind spot where "human" was a lie.

**Why this is the right frame, not a retreat:**
- **Correct by construction** at zero network — we assert only what we can see (invariant #5,
  extended from the tier to the headline).
- **Cheap on what's built** — the proof core, tiers, carriers, sworn declarations, and verifier all
  survive unchanged; only the mirror's *question* changes. A positioning reframe, not a rewrite.
- **Points the same way as the paying asker** — a diligence/compliance asker wants exactly "is this
  disclosed and verifiable." The zero-network wedge and the eventual customer finally align.

**The cascade (apply consistently):**
- **The mirror** leads with the Disclosure Score; "undisclosed," never "human" (`apps/web/.../analyze`).
- **The live index** (below) becomes **"State of AI *Disclosure* in Open Source"** — how much of
  open source *discloses* its AI use. "Only N% of commits disclose AI involvement" is honest,
  citable, and correct, where a global "X% is AI" is wrong-low (same 0%-recall problem; consistent
  with the coverage-not-AI% decision, §5).
- **The badge / CTA** show your Disclosure Score; the CTA is *"raise it"* (prove / capture / sign).

**Branch B is fuel, not frame.** Harvesting *more* zero-network evidence — reading file contents
(the mirror currently blobless-clones metadata only) for AI-tool config presence (`.cursor/`,
Copilot/aider), `@generated`, more trailer formats; plus offline signature verification — now
honestly *raises the disclosed slice* instead of pretending to measure AI. Off-limits (per the
research): stylistic "this looks AI" detectors — the reframe is precisely what frees us from needing
them.

**Honest cost:** "how verifiably disclosed" is a less visceral hook than "60% AI." This completes the
trade the coverage-not-AI% decision (§5) began: MadeBy is the **disclosure / verifiability ledger**,
not an AI detector — the correct identity for a trust company, a narrower curiosity pull, but every
answer is true.

### Presentation: the headline is human/machine, details underneath (decision, 2026-08-11)

The read's *headline* answers the one question people actually ask — **"a person or a machine?"** —
as a **confidence gradient, not a taxonomy.** People collapse bots, codegen, and AI into "not a
person," so the bot-vs-AI and deterministic-vs-generative distinctions live in the **details
underneath** (progressive disclosure, `ARCHITECTURE §1`), never the headline. Three honest positions:

- **Machine** — a bot committer *or* disclosed AI: a **provable floor** on machine involvement,
  labeled *"machine / automation (incl. disclosed AI)."*
- **Unverified** — a person *committed* it, but machine-assistance isn't disclosed. The honest middle.
- **Attested human** — a person *affirms* human authorship (the `Authored-by-human` trailer; sign or
  swear it to climb the ladder — `ARCH §3`). The precise point: **human authorship is *testimony*,
  not an *artifact*.** You *can* witness your own authorship firsthand — it simply leaves nothing
  independently re-checkable, so to a third party it is an *attestation* (asserted → signed → sworn
  testimony), never a verification that no machine was involved. AI is the mirror image: it *can*
  leave a re-checkable artifact (a session log, `madeby ai`), and inline AI leaves *none* (≈0% untrailered
  recall). Both directions climb the **same tier ladder**; the only asymmetry is artifact-vs-testimony
  on the *evidence* axis, not the tier — which is why the honest default *past a positive signal*
  stays **unknown**, never human.

**Two layers map onto it** (the free floor + the adoption upgrade, validated on real repos, #118):
- **Ambient (free):** hands you the **machine floor** (bots by committer identity + disclosed AI) and
  marks the rest **unverified** — it can prove *some* machine and *presume* the rest human; it cannot
  *verify* human.
- **`.madeby` / disclosure (adoption):** moves work out of the unverified middle — you either
  *attest* the human part (sign + sworn declaration) or *disclose* the machine/AI part
  (capture / trailer). Adoption = earning the confidence you can't get for free.

**Two hard honesty guards (so the floor never becomes a fake ratio):**
1. **Machine ≠ AI.** The machine bucket includes dependency bots and codegen; label it
   *machine/automation*, never claim the whole bucket is AI.
2. **Involvement ≠ code-share.** It is a **floor on machine involvement across *commits*** (stated as
   "≥"), never a percentage of the *code* — that is the diff-size over-claim we refuse (`TESTING §2`).

**Why this is the honest engine — the latent "human by default" presumption.** Most people *presume
unverified code is human-made.* There is no good *reason* for the presumption (and it gets more wrong
as AI floods everything), but it is out there — and that latent expectation is the whole point.
Reaction is **expectations − results**: showing someone what they already assume is boring; showing
them their assumption is *wrong* is what surprises and spreads. **We** honestly label the middle
*"unverified"*; the **audience** reads it *"human."* So MadeBy's value is **making that unwarranted,
universal presumption checkable**, and the engagement energy is the audience's own prior being
violated when a *provable machine* floor turns up under something they assumed a person made (e.g. a
frontier lab's SDK that is 76% machine-authored, #118). This stays honest — we surface only the
**provable** floor, never an inferred gap — and **neutral** — the machine authorship was *disclosed*
by identity (the maker didn't hide it; the audience merely assumed), so it reads as *surprise*, not
*gotcha*. It is the first honest answer to the viral-hook OPEN PROBLEM (§3): not a fabricated shock
number, but **surfacing where a widespread presumption is wrong** — the surprise comes free from the
prior, and *grows* as the prior gets more wrong.

### We point to identity, we don't host it — person-naming is consensual or relationship-gated (decision, 2026-08-11)

Extends the human/machine headline and **detect-don't-host** to the person axis. **In the general
public case, MadeBy asserts the *determination* — "a person" or "a machine" — and *points* to where
the specific identity is disclosed (the repo / the GitHub handle as a link-out); it does not *host* a
public profile of the author.** The maker's identity is already disclosed in their own repo/GitHub —
we reference it, we don't re-host it, exactly as we reference a content hash (not the content) and
point to a self-hosted declaration (not host it).

**Specific-person naming is reserved for the contexts where it has both value AND a lawful basis:**
- **Consensual** — the person *claims/attests* their attribution → naming is opt-in (the credit
  flywheel, §1: public credit is *accepted*, never a dossier imposed).
- **Relationship** — the **enterprise** (controller of its own people's data) and the **repo owner**
  (their own repo/contributors).

**Why:** hosting a stranger's identity on our site buys little general-case value and most of the
risk (GDPR profiling, the dossier problem, defamation). Pointing keeps the mission (person-or-machine),
keeps the honest-broker posture, and **collapses the public-corpus PII exposure** (`COMPLIANCE.md`).
The "surprising humans" hook survives — *"this critical library is essentially one person → @handle"* —
just **opt-in-shaped** (they claim to be credited), which is honestly better than profiling. Mission,
crisper: **MadeBy says whether a thing was made by a person or a machine, and points to who — it is
not a public directory of who-made-what.** (Public resolver page shows the determination + the
@handle as a link-out; the full profile/reach card is relationship/consent-gated — `ARCHITECTURE §1`.)

### Honest backfill for existing repos (decision, 2026-08-11)

Adopting MadeBy on a repo with years of undisclosed history must not force a dishonest choice —
neither stamping the past as disclosed/human (fabrication) nor showing a scary bare 0%. There **is**
an honest way, in layers, governed by one invariant: **backfill adds only evidence you can point to,
or an explicitly-labeled assertion — it never raises a commit's origin above its evidence. Unknown
stays unknown; it just becomes explicitly, verifiably unknown-as-of-a-date instead of silently
unknown.**

1. **Recognize what's already there** (free, pure evidence). The recognizer runs over *full* history:
   existing `Co-Authored-By` AI trailers, DCO sign-offs, signatures, and bot authorship are
   recognized now even though they predate adoption. Much of a repo's history is already partly
   disclosed — zero fabrication.
2. **Attach recoverable evidence** (opt-in, evidence-grade): old AI-tool session logs via `madeby ai`
   (structurally verified — only matches content actually present), committed AI-tool configs
   (repo-level signal).
3. **Set the adoption boundary** (the watermark). The commit that introduced `.madeby/policy.json`
   *is* the dated, signed boundary (derivable: `git log --diff-filter=A -- .madeby/policy.json`).
   Coverage is reported **relative to it**: post-boundary commits are in-regime and measured;
   pre-boundary commits are **`unknown`** (never "human", never "AI" — the default-to-unknown
   principle) unless independently disclosed by (1)/(2). The gap is explicit and dated, not hidden.
4. **Optional author self-attestation** (asserted tier) — the author asserts specific pre-boundary
   facts they honestly stand behind ("I solo-authored the initial import"; "vendor/ is third-party").
   Labeled self-reported, capped, contestable (§11) — never presented as proof.

This is discoverable to agents as the `madeby://guide/backfill` MCP resource; enforcement (making the
check required — the host's control plane, not a MadeBy tool) as `madeby://guide/enforce`.

### The adoption wedge: the OSS maintainer PR-disclosure gate (decision, 2026-08-10)

**Not the enterprise buyer.** Security/compliance are where the *pain and budget* eventually sit, but
they are terrible *first* customers (multi-quarter procurement, security review, champion churn,
they want references we don't have). Rejected as the wedge.

**The wedge is the OSS maintainer.** Maintainers are drowning *now* in AI-PR slop and the
license/DCO anxiety it brings, and several projects have already posted "no AI" / "disclose AI"
contribution policies. This is the forcing function every earlier framing lacked:
- the maintainer is an **asker with pain AND the authority to compel the creator** — one maintainer
  adopting forces disclosure from every contributor (the asker-vs-creator split, solved);
- it works in a **network of one repo** (cold-start, solved);
- a **GitHub Action / check is self-serve, free, and viral among maintainers** (no sales motion);
- every gated PR **produces a disclosure record → fills the corpus → powers the public index** (the
  flywheel finally has a motor).

**The mechanism is a DCO-style disclosure sign-off — disclosure, never detection.** Modeled on the
Developer Certificate of Origin (`Signed-off-by:`) every maintainer already trusts: the contributor
goes **on the record** ("this PR contains no AI-generated code," or "AI use is disclosed per this
manifest"), recorded with provenance at the asserted/sworn tier. This is the **first real use of the
sworn carrier (#96)**. We **never** ship an AI *detector*: `RESEARCH` shows any code detector
false-positives on real human code (the §7 61.3%-FP-on-non-native-English landmine), and
false-accusing contributors at PR scale is the cardinal sin industrialized. Detector = harm +
lawsuit; disclosure gate = honest, trusted-pattern, defensible. **That distinction is the product.**

**We provide the mechanism; the maintainer owns the policy.** If a maintainer turns a required
disclosure sign-off into a de-facto AI ban, that is *their repo's call* — we neither advise it nor
stand in its way. We ship a neutral instrument (state your origin, on the record); what a project
gates on is theirs. We do not build the banhammer, and we do not moralize about it.

**Recognize existing disclosure — "recognize everything, own nothing."** The index and the gate are
worth little if they only read MadeBy-native disclosure. Value is proportional to how much *existing,
in-the-wild* disclosure we recognize, so we build an **open disclosure-signal recognizer registry**
(`packages/core/src/disclosure.ts`) spanning ours + external standards: AI-authorship trailers, the
**DCO `Signed-off-by:`**, commit signatures, committed **AI-tool configs**, **SPDX/REUSE** metadata,
**in-toto/SLSA** provenance, and our own manifests/declarations. Same open posture as the carrier
registry (`ARCHITECTURE §3`) and detect-don't-host.

**It graduates from a local module to a hosted, community-fed data service.** The registry starts as
code (`disclosure.ts`), but the set of recognized carriers/types becomes a **hosted, versioned
dataset** the tool pulls and caches (`ARCHITECTURE §3`, the cross-carrier `who` sweep): users propose
new attestation types, lightweight curation folds the reasonable ones in, and every tool recognizes
them with no release — coverage *compounds*. Being its **canonical steward is an authority moat** (§6
"authority moat"), **not lock-in**: the registry stays open for anyone to implement (`MISSION.md`
value 6), and it only ever widens what we can *read*, never what we're willing to *believe* (the
trust cage, `ARCHITECTURE §3/§12`).

**The flywheel (now with a forcing function):** the gate compels disclosure → the recognizer reads
it (ours + others') → the index aggregates it into public authority → authority drives more
maintainers to the gate.

**Build sequence:**
1. **The disclosure-signal recognizer registry** — the shared engine for gate *and* index; buildable
   now; consolidates what we already recognize + adds DCO/SPDX/in-toto. (Landing now.)
2. **The PR-gate GitHub Action** — the actual wedge a maintainer installs: read a PR's disclosure,
   post a summary, optionally require the disclosure sign-off (maintainer-configurable).
3. **The public disclosure index** — "State of AI Disclosure in Open Source"; trails on ingestion
   infra (Modal/DB), but the recognizer is its engine.

This **re-sequences** the §3 GTM: the maintainer gate leads; the enterprise dashboard (below) is a
*later monetization*, not the wedge; the aggregate index becomes the *disclosure* index (per the
reframe above).

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

> **Updated ignition — the maintainer forcing-function flywheel (decision, 2026-08-11).** The changes
> this session shifted value toward *density/reliance* (the registry, supply-chain gates, governance),
> which are network-dependent — so they *weakened* the curiosity-mirror first-user hook (an honest
> Disclosure Score spreads less than the shock "60% AI" number). **Honest consequence: the first-user
> flywheel got harder, and the igniter is no longer the mirror — it's the maintainer.** An
> AI-PR-slop-weary **maintainer** adopts the gate for a *selfish, zero-network* payoff (automated
> disclosure/accountability control over their own repo's incoming PRs, via two committed files, day
> one). Because it is **disclosure not detection**, it is *retainable* (no false-accusation fights to
> make them uninstall it). The multiplier: **the gate is a forcing function** — every contributor
> must disclose/sign/record to pass, so one maintainer's single action **manufactures N producers**
> who never chose to adopt. The loop: *maintainer control → conscripted contributor-producers →
> maintainer↔contributor spread → `.madeby` travels + registers → dependency-graph density → (past a
> threshold) consumer/reliance value switches on → consumers demand-pull provenance from producers →
> reinforces and monetizes.* **GTM:** ignite at a few **high-dependency-centrality** maintainers
> (popular libs) — one adoption seeds *both* contributor-production *and* consumer-side travel-density.
> **Honest weaknesses:** the first-user payoff is *moderate not viral* (a disclosure gate is a partial
> slop fix, competing with a written CONTRIBUTING.md; the two-file lightness is what makes it
> plausible); the monetizable reliance value is *density-gated* (a J-curve — modest early, switches on
> only after density); and discovery got quieter. The flywheel is real but slower-igniting — a
> forcing-function loop bought with honesty, relying on a few high-leverage maintainers each
> conscripting many, not on virality.

> **OPEN PROBLEM — the viral single-player flywheel is missing; come back to it (flagged 2026-08-11).**
> The maintainer loop above is **conscription** (a maintainer with pain acts and *forces* others in),
> not **virality** (any one user gets value and the getting-it spreads on its own). Trading the shock
> "60% AI" number for an honest Disclosure Score (the §3 reframe) gave up the one genuinely viral
> single-player hook and did **not** replace it. This is a known GAP, not a solved node. A replacement
> must clear **all** of: **(1) selfish, zero-network payoff** — complete value to user #1 in a network
> of one; **(2) self-spreading** — obtaining the payoff recruits the *next* first-user (the share *is*
> the growth); **(3) honest** — no fake AI ratio; the reframe is not up for renegotiation; ideally
> **(4) produces provenance/density as a byproduct.** The old mirror had (1)+(2) but bought (2) with
> dishonesty; the badge has (2) but no zero-network value. **The crux of the problem is criterion
> (2)'s hard part: the shared artifact must be compelling/credible to a stranger who has never heard
> of MadeBy** (the shock number had that for free; an honest score does not). Unexplored directions to
> test later (NOT decisions): an honest "year-in-code / wrapped"-style personal artifact (a truthful,
> shareable ego-object), and the **credit/receipt** angle (a proud builder's verifiable *"I made
> this"* they *want* to display) — each stands or falls on whether it clears (2)'s stranger test.
>
> **Direction found (2026-08-11): the honest energy source is *expectation-violation*.** Not a
> fabricated shock number, but the gap between the audience's latent *"unverified = human"* prior and
> the **provable machine floor** (§3, "the headline is human/machine"). The surprise — *"you assumed
> a person made this; a machine made ≥N% of it"* — is honest (provable floor only), neutral (the
> machine authorship was disclosed by identity, not caught), grabs a stranger via a subject they
> already care about, and *grows as the prior gets more wrong*. Still to work: the *artifact* and the
> *reach* (the ambient read's richness + producer discovery, both gated on the cheap metadata corpus
> + identity resolution). Energy source clear; delivery vehicle still open.

### The live index: "State of AI in Open Source"

Not a one-off study — a **constantly-updated page**, powered by continuous public-git
ingestion. **Reframed (2026-07-06, see the reframe subsection above): the headline is AI
*disclosure*, not AI *authorship* — "how much of open source discloses its AI use" (honest and
citable), not "how much is AI-written" (wrong-low, ~0% untrailered recall).** Trends over time and
breakdowns by language/ecosystem. (Technical home: `ARCHITECTURE.md` §8.)

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

**Corollary — neutral on *absence*, too (carrot never stick).** The same rule extends to a subject
that hasn't disclosed at all: **celebrate disclosure, stay neutral on its absence.** An unclaimed /
undisclosed page reads *"not yet disclosed,"* never a red flag, failing grade, or "hides its
origins"; claiming is framed as *adding* provenance, never *removing a stain*. A trust company must
not run the Glassdoor **shame-to-claim** dark pattern — it converts better short-term and is exactly
the corrosion we refuse (§6). Enforced by the page semantics + the *demand-generated, not crawled*
rule (answer questions, don't build dossiers) in `ARCHITECTURE §1`.

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
> tell either way. Think that's wrong? Record the AI's share with **`npx madeby ai`**, or affirm your
> own authorship with **`npx madeby me`** — either way, you raise your disclosure."*

**The provocation is symmetric — and that is the point.** We hand you *two equal, opposite verbs*, so
the tool can't be read as pushing a verdict either way:
- the **AI-proud** vibe-coder, wanting credit for the AI's share we can't yet see, runs **`madeby ai`** to record it;
- the **human-proud** author, wanting no ambiguity, runs **`madeby me`** to *clear the doubt* and stand
  behind their own work.
Both roads are the same asserted→verified conversion action — one verb per motivation, offered equally. Framing the CTA as *resolve the doubt*
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

**The commands are `ai` and `me`** (`npx madeby ai` / `npx madeby me`) — the two symmetric write verbs
of the "made by ___" surface (`who`/`ai`/`me`, renamed from the earlier single `prove` in the
UX-minimization pass: "prove" over-claimed — what you record is asserted-tier, self-reported, not
proof — and it collapsed two opposite motivations into one word). `ai` records your AI session's
witnessed spans (the `capture-local.ts` engine); `me` affirms your own authorship; `who` reads the
result back. Zero-install `npx` is the frictionless path the study named as the flywheel bet.
**Launch prerequisite:** the `npx` package must exist before the mirror is public — you cannot publish
a CTA to a command that 404s (itself a trust-brand tell). Until then the CTA is staged on the localhost mirror.

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
  **(Re-weighted to the primary *defensible* target — see the decision below.)**

### The defensible business: intra-org AI-provenance governance (decision, 2026-08-10)

A full moat pass (this session) re-weights the lines above. The **public maintainer gate + mirror
are the funnel and the authority play — free, and no moat by design** (open protocol, public/portable
data: anyone can re-index it). The **defensible business is the compliance line, promoted from
optionality to the primary target: intra-organization AI-provenance governance** — the same engine
(mirror + recognizer + gate + non-repudiable record) pointed *inward* at a company's private repos.

**Why intra-org, not cross-party:** the value is a *standing, recurring* need (govern our AI-code
IP/license/compliance continuously), a *single buyer* (no multi-party coordination), and the blind
spot that cripples the public mirror *closes by policy* (the org mandates disclosure/capture on its
own tooling). The moat is **per-customer data gravity + workflow lock-in + compliance stickiness** —
reliable and immediate, not network-effect-gated. Cross-party resolution is the *emergent* network
on top once intra-org density exists, not the entry moat.

**The buyer:** the *why* sits with **Legal/IP + Compliance/AI-governance** (the risk owners; the
sworn/legal non-repudiation layer, §2, speaks their language), with **CISO/supply-chain** a
co-champion; the *operation* falls on **Platform Engineering** (who run the gate in CI). The budget
owner is the **AI-governance / compliance / risk function** — explicit mandate, recurring budget,
able to compel engineering. Motion: **top-down mandate + bottom-up-trivial implementation** — the
lightness of the gate (a file + a workflow) is precisely what lets a compliance mandate land without
an engineering revolt.

**The moat mechanism is default gravity, not lock-in.** The protocol stays agnostic (BYO
identity/ledger, §2), but the product ships **one zero-choice default profile** whose reporting
points at **madeby.fyi** (`ARCHITECTURE §3`). Most teams never change a default → derived provenance
+ the grant graph + the dashboard-habit concentrate at our hosted layer, *without* our holding
identity, ledger, or source. Agnosticism is what makes the default *trustworthy* (you accept it
because you can leave); the default is what builds the moat. Contestable by GitHub only via a
*cross-vendor, Copilot-neutral* default — which, selling Copilot, they structurally cannot ship.

**Build discipline unchanged:** this re-weights the *target*, not the near-term plan. Governance is
Tier-2 (`OPERATIONS.md §4a`), **validated with a design partner before it is built** — cheaply, by
having one org run the free `madeby check`/`who` across its private repos and asking the compliance
owner *what dashboard, record, and report they would pay for on top.* The act of attribution stays
free forever; we charge for governance, trust, and asking at scale.

### Monetization shape: free to produce, paid to rely (decision, 2026-08-10)

Take the governance product as ~free to the legal/compliance *producer* (to maximize graph density).
Then revenue moves to the **reliance** side — the correct shape for a record utility (credit bureau,
Carfax, Plaid, a CT log: producing is free/cheap; *relying* is paid). The producer creates records;
the **relier** pays — an auditor, an acquirer, a platform, an insurer, or the org's own
*prove-to-a-third-party* event. Default gravity means **only MadeBy can authoritatively answer
cross-graph reliance queries**, so the paid side carries the moat, not the free side.

Paid vectors (promoted from the optionality list above):
- **Asker-side verification at scale (the rail):** pay to verify/query provenance, especially across
  the **supply chain** ("is my vendor's / dependency's / target's code AI/license-clean and
  attested?"). Largest TAM; the emergent cross-org network monetized; per-verification or subscription.
- **Prove-to-a-third-party events:** the producing org pays at a reliance *event* (RFP, audit,
  acquisition, regulator) for a **certified, legally-recognized, selectively-disclosable attestation
  package**. Free to record; pay to prove-to-others under assurance.
- **Enterprise operational envelope (open-core):** SSO/RBAC, data residency, certified-record
  retention, SLA, audit support — paid by **platform/procurement**, not the legal dept.
- **Risk-transfer / insurance (later, heavy):** an attested provenance-clean codebase is lower
  IP-litigation risk → warranty / lower premium; MadeBy as the **risk-scoring layer insurers price
  against**. On-mission (accountability, not surveillance) but regulated/capital-heavy — a partnership
  play, not near-term.

**Hard guardrail:** reliance = **consented, permissioned VERIFICATION** (a specific question about a
specific subject, with consent) — **never bulk provenance-data sale** (the ruled-out corruption
below). A verification rail is on-mission; a provenance data broker destroys the trust it sells.

**The question that decides rail-vs-toll-road: is reliance continuous or episodic?** Revenue scales
only if reliance is wired into **continuous decision points** (every build, PR, dependency update,
procurement check, compliance stream) rather than firing only at discrete deal/audit events. See the
next subsection for the answer.

### Reliance is continuous by construction, not by hope (decision, 2026-08-11)

**Reframe:** provenance is relevant at the points where code-supply decisions are made *constantly*
— every dependency added, PR merged, build shipped, vendor onboarded — not only at the *rare* events
(diligence, audit, litigation). Reliance *looks* episodic only because the graph isn't yet dense
enough to consult every time; **density moves provenance to the continuous decision points where it
naturally belongs.** So continuity isn't a market property we wait to discover — it's a property of
the products we put on the graph.

**The reliance ladder** (move reliance up it deliberately):
- **episodic** (diligence / audit / litigation) — real, high-value, but lumpy per-event;
- **continuous-discretionary** (scores, monitoring — adopted because useful);
- **continuous-mandatory** (transitive gates, compliance streams — forced by regulation / IP / supply-chain security).

**What to build on the dense graph, lead first:**
- **[LEAD] Transitive provenance-policy gate** — fail the build if *any dependency's* provenance
  violates policy (undisclosed AI over threshold, license/IP-risky tool, unverified maintainer).
  Runs on **every build**; **on a surface we already own** (the CI gate, now reading the cross-org
  graph); forced by IP/security; a direct extension of what's shipped; and it **only works if the
  graph is dense**, so it is the graph's first paying reliance customer. It converts
  episodic→continuous single-handedly.
- Supply-chain provenance **monitoring** (Dependabot-for-AI-provenance); **continuous compliance
  evidence** (always-current attestation for EU AI Act / ISO 42001 — the strongest forcing function);
  **M&A / litigation / certified-package** products (episodic, high-value, the legal-non-repudiation moat).
- **Platform/API** — expose the graph so third parties build vertical tools → the graph becomes
  load-bearing infrastructure others depend on (the deepest continuous reliance and moat).

**`.madeby` is the display surface — so the "score in review/registry/IDE" is NOT distribution-gated.**
The signal travels *with the code* (a package ships its `.madeby`; a repo carries it in-tree), so
the provenance is already present at the decision point — no placement in GitHub/npm/IDE UIs needed.
It's an **open format**, **offline-verifiable** (the two-hash invariant binds its claims to the bytes
actually received — a dependency can't ship a lying `.madeby` that survives verification). `.madeby`
is the *data* surface; we own the **renderers** that read the local files — the **PR check/comment we
already ship** (highest-traffic decision point, no partnership), `madeby inspect <package>`, an IDE
extension. This **unifies the gate and the score onto one in-tree read** (one gates, one displays).
The one thing the traveled file *can't* carry — **current validity / revocation** (it's a publish-time
snapshot) — is deferred to the **authority** (madeby.fyi, the OCSP-shaped responder), and that
freshness check *is* the continuous query traffic to the moat surface. The default profile must
ensure `.madeby` is **published with the package** so provenance actually travels.

The file also carries an **optional authority pointer** (default madeby.fyi, swappable) so renderers
*enrich* the offline-verifiable base with live API data (current validity, reputation, grant state) —
enrichment is optional (offline verify never depends on it). The pointer resolves against wherever
*that artifact's* records live (data-locality, from the `#105` reporting model): public artifacts →
public madeby.fyi; an org's own private artifacts → the org's workspace. The default pointer is where
**default gravity lives in the carrier**: the ubiquitous `.madeby` files reference our authority by
default, routing every enrichment/validity call to us (`ARCHITECTURE §3`).

**Decisive variable = the forcing functions** (regulation, IP/license liability, supply-chain
security). Where one makes provenance a *must-check-every-build*, reliance is continuous and
non-optional; two of the three are strengthening through 2026, which makes the continuous case
bet-able rather than wishful. **Honest gates:** all of this is downstream of producer-side *density*
(a transitive gate is useless if deps aren't covered), and format *recognition* is the slow part.

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
