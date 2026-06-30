# MadeBy — what we're building, and why

> **The question:** *Who made this thing?*
> MadeBy lets people — and AI — answer that, **verifiably**, for digital content. We start with code.

This is the plain-language version of what we're doing, written for anyone: a teammate, a
designer, a potential hire, an advisor. (The detailed engineering and strategy docs sit alongside
this one — `STRATEGY.md`, `ARCHITECTURE.md`, `OPERATIONS.md`, `TESTING.md` — but you don't need
them to understand the idea.)

---

## The problem

For all of history, "who made this?" had a roughly trustworthy answer. A painting had a painter, an
article had a byline, code had an author. You might not know them, but *someone* did, and the chain
back to them mostly held.

Generative AI breaks that. Content can now be produced faster than anyone can track, by a blurry mix
of people and machines. The honest answer to "who made this?" is increasingly *"nobody's quite sure."*
And that answer is getting more expensive every month — because the question isn't idle curiosity. It's:

- **Credit** — who deserves the acknowledgment for this work?
- **Trust** — is this from who it claims, and unaltered? (Think: a software dependency, a news image.)
- **Liability & licensing** — if an AI wrote this code, who's responsible for it, and who owns it?
- **Disclosure** — regulations (the EU AI Act and others) increasingly *require* you to show provenance.

Nobody owns the trustworthy answer to "who made this?" for the AI era. We intend to.

## What MadeBy is

MadeBy is a **provenance layer**: a service that records who made a piece of content, and lets anyone
check that record later. Think of it less like a product and more like a *utility* — something that
runs quietly in the background until you need an answer. Galleries and auction houses keep a
*provenance* record for a work of art: the documented trail of who made it and how it's changed
hands — the thing that separates a genuine piece from a forgery. MadeBy is that record for digital
content, and checking it takes a second and costs nothing.

Two things make that hard, and therefore valuable:

1. **Anyone can *claim* anything.** A claim with no backing is worthless to a skeptic. So the core of
   MadeBy isn't claims — it's **proof**: cryptographic, tamper-evident evidence that survives scrutiny.
2. **Provenance has to be honest about how sure it is.** A system that says "verified!" when it isn't
   is worse than useless — it's dangerous. So everything we report comes with an honest confidence
   label.

That second point is the heart of the whole thing.

## The core idea: an honest ladder of trust

Trust is never a single yes/no. MadeBy reports it as a **labeled ladder**, and our job is to make the
rung legible at a glance — and to *never* let a low rung pretend to be a high one.

| Rung | What it means | In plain terms |
|---|---|---|
| **Asserted** | Someone said so. | "This person *claims* they made it." Free, frictionless, no proof. |
| **Sworn** | A legally binding statement. | "They *swore* to it, and a false claim is actionable." Teeth, without cryptography. |
| **Verified** | A known, checked identity stands behind it. | "We confirmed *who* signed this." |
| **Bound** | Cryptographically tied to the exact bytes. | "Mathematically proven — this exact content, by this signer." |

The trick that keeps us honest: **when we're not sure, the uncertainty goes into the rung, never into
silence.** We always *name the creator* — the people and the AI models involved — and express how
confident we are through the tier and a caveat. We never shrug and say "no signal detected." That's
honest, but it's a non-answer, and answering is the entire point.

> We **order evidence; we don't assert truth.** If two people claim the same work, we rank by tier,
> timestamp, and lineage — we don't play judge.

## How it actually works

A few simple ideas do most of the work:

- **We answer when asked.** Provenance isn't something we shout; it's something we can produce the
  moment someone wants it. That "asker's moment" is the center of the design.
- **Content has a fingerprint.** Any file or commit can be reduced to a unique fingerprint (a hash).
  We attach the provenance record to that fingerprint — so even if the content travels, gets copied,
  or has its metadata stripped, we can still recognize it and answer.
- **We ride existing standards.** Where good open standards already exist (C2PA for media, Sigstore
  for code), we build on them rather than reinvent. We add the parts that are missing: verified
  identity, the resolver that answers questions, and the legal layer.
- **We are the trust layer — not the bank.** A creator's identity can include a crypto wallet, so
  value *can* flow to the right person. But we don't move the money ourselves; we produce the verified
  "who made it" graph, and let payment systems plug into it. Becoming a payment rail would drag in
  regulatory weight and speculation that would poison a trust instrument. Hard line: not the bank.

## What if two people claim the same thing?

Anyone can *say* they made something — so what stops people from claiming work that isn't theirs?

The answer is that **a claim with no backing can't climb the ladder.** Someone falsely claiming your
work can't produce your verified identity, can't sign it with a key tied to the real source, and
can't show the upstream history — so their claim is stuck on the bottom rung, displayed honestly
*next to* yours. We don't hide it or delete it; we show each claim at the strength it has actually
earned, and the gap is obvious at a glance. A practical consequence: **squatting doesn't work here.**
Unlike grabbing a username or a domain name, you can't hold content hostage by claiming it first —
claiming something you didn't make gets you nothing, because the real maker outranks you the moment
they show up.

When it's a genuine close call — two parties who each have a real case — we don't play judge. We show
both, ranked by the evidence, and we never invent a winner. And the record stays open: new evidence,
even a court's decision, can update it later.

For a company, the simple version is this: connect your systems once, and everything your team
creates is recorded as yours from the moment it's made — nobody has to learn how any of this works.
If someone later claims something that's genuinely yours, the facts plus that record resolve it
quickly. The one thing we will never do is let the bigger checkbook win on its own — being *right*,
not being *big*, is what carries the day.

## Why we start with code (and "vibe-coding")

"Creators of all kinds" is the destination. **Software is the beachhead**, for concrete reasons:

- Visual media already has a powerful incumbent standard (backed by Adobe, Google, camera makers).
  **Code has no provenance standard** — the lane is open, and we can define it.
- Code is *already* fingerprinted. Git — the system virtually all software is built with — identifies
  every version of every file by a hash. The hardest part of our architecture is free here.
- The "human vs. AI" question is at peak urgency in code *right now*: licensing, liability,
  supply-chain security, and the very personal "how much of this did I write vs. the AI?"

And **vibe-coding** — building software hand-in-hand with AI tools like Claude Code, Cursor, and
Copilot — is the viral surface. It's a loud, online, sharing-prone community that is genuinely curious
and a little anxious about exactly the question we answer. Better still: those AI tools already keep a
record of what they did, so the answer can be *generated from the tool's own logs* rather than
self-reported. The AI is a witness to its own work.

## How it grows

A provenance registry with nothing in it is useless — nobody queries an empty database. So the growth
engine and the product are the same thing:

- **Attribution is free, forever.** Giving credit is frictionless and costs nothing. That's not a
  loss-leader — it's how content and identities flood *into* the system, so there's something to check
  against when a skeptic shows up. **Proof is the moat; free credit is the flywheel that fills it.**
- **The first thing you do is selfish and instant.** Before any network exists, MadeBy hands one
  person a complete payoff: *"connect your code, see how much of it is AI-written."* It's a curiosity
  mirror — like Spotify Wrapped — interesting enough about *you* that sharing happens naturally.
- **The badge is the ad.** A small `madeby.fyi` badge in a project's README is seen by everyone who
  visits, and links back to the full, authoritative answer. The artifact markets itself.
- **A live "State of AI in Open Source" index.** A continuously-updated, citable number for how much
  of open source is AI-written — an authority asset and the top of the funnel ("...now check your own
  repo"). The same engine, pointed at a company's private code, becomes the internal dashboard
  enterprises will pay for.

> One rule we will not break here: we **celebrate transparency, not low AI usage.** A 90%-AI project
> wears its badge as proudly as a 90%-human one — both told the truth, verifiably. The prestige is in
> *having disclosed and proven*, never in the ratio. (If we implied "more human = better," we'd insult
> the very community that spreads us.)

## What we refuse to do

Because we're selling trust, some doors stay shut on principle:

- **We never report false confidence.** When evidence is missing, we fail *safe* — we degrade to a
  lower, honest rung. We never round up to "verified."
- **"Don't trust us — verify."** We publish our spec, our test cases, and a standalone tool so a third
  party can independently confirm a proven claim using ordinary, open cryptography — *without* access
  to our code. Our trust doesn't depend on anyone trusting us.
- **We don't sell the data or run ads against it.** A trust instrument that monetizes its data is no
  longer trusted.
- **We don't become the bank**, and **we don't adjudicate disputes** — we present ordered evidence.

## The business, in plain terms

The elegant part: **the trust ladder and the pricing ladder are the same ladder.**

- *Asserted / credit* → free, forever (the flywheel).
- *Verified* → paid: teams, verified identities, signing, the earned badge.
- *Asking at scale* → paid: platforms, marketplaces, moderation systems, and AI labs that need to
  query provenance in volume.
- *Supply-chain & compliance* → paid: enterprises gating releases and meeting disclosure rules.

We charge for **trust** and for **asking at scale** — never for the act of giving credit. Honesty and
revenue point the same direction, so we never have to choose between them.

## Where we are, and where we're going

The foundations are built and proven out:

- The **trust core** — fingerprinting, the honest tier logic, the proof format — exists and is heavily
  tested, including an adversarial "red team" that tries to forge high trust and is defeated every time.
- The **"verify without trusting us"** path is real: an open reference verifier and a recipe anyone can
  follow with standard tools.
- The **company** is being formed (a Delaware C-corp), and the infrastructure to run live is staged.

What's next: stand the service up on real infrastructure, ship the "analyze your git history" mirror,
launch the public index, and turn on the vibe-coding wedge.

## What becomes possible

It's easy to read all this as a handy tool — a badge, a dashboard, a checker. Step back, though.
A surprising number of things we take for granted quietly depend on being able to trace something
back to whoever made it: credit, payment, trust, responsibility, ownership — even our shared sense of
what's real. None of them work without a reliable link between a thing and its origin.

**AI is severing that link at scale.** As it does, those things start to wobble — not all at once,
but steadily. The maintainers who built the world's software go unpaid. Creators' work is absorbed
without acknowledgment. A convincing fake becomes indistinguishable from the real thing — so people
stop believing the real thing, too. And when something goes wrong, there's no one to hold
responsible, because "nobody made it."

A working provenance layer is the structural beam that keeps those things standing. With one in place:

- **Credit — and eventually compensation — can follow the work.** When a contribution is tied to a
  verified identity (whose key can also receive value), acknowledgment and payment can flow to the
  people who actually did the work, instead of stopping at whatever platform happens to host it. We
  don't move the money — we produce the verified map that lets others do it honestly.
- **Trust becomes something you check, not something you guess.** The flood of synthetic content
  otherwise forces an ugly choice: be gullible, or be cynical about everything. Verifiable provenance
  is the third option — a genuine thing can prove it's genuine, and a fake can't borrow that credibility.
- **Responsibility can attach again.** A claim someone swore to, code signed by a known party, content
  bound to its maker — each hands the world a chain back to someone who stands behind it. Accountability
  needs a name; provenance supplies one.
- **Humans stay visible as AI does more.** Because the record names *both* the people and the AI
  involved, working with AI doesn't erase the human contribution — it documents it. The goal was never
  less AI; it's an honest account of who did what.
- **The software the world runs on gets safer.** Almost everything sits on a deep stack of open-source
  code written by strangers. When each piece can prove where it came from and who's behind it, a whole
  class of supply-chain attacks gets much harder to pull off.
- **People own a portable creative identity.** Your body of work and the proof behind it travel with
  you, instead of being rented from a platform that can change the rules or vanish.

These compound. Every verified record makes the next answer more valuable, until checking provenance
is as ordinary as following a link. That's what "infrastructure" means: not a feature anyone thinks
about, but a layer the rest of the world quietly stands on.

## The world we're building toward

We're betting that the ability to answer *"who made this?"* — honestly, and with proof — is about to
become load-bearing for the digital world, the way trustworthy addresses underpin the mail or a
recognizable signature underpins a contract. AI is the forcing function: it makes the question harder
and far more important at the very same moment.

The world we want is simple to state: one where "who made this?" always has an honest answer — naming
everyone who contributed, human and AI, and exactly as confident as the evidence allows. A world that
can embrace machines as collaborators without losing track of the people.

That's what MadeBy is for.
