# MadeBy — Technical Architecture

> Companion to `STRATEGY.md` (why), `OPERATIONS.md` (how we run it), and `TESTING.md` (how we
> keep it trustworthy). This document is the technical design v2 is built against — *what* and
> *how*. The first attempt is in `archive/v1/`.

The whole system answers one question — *who made this thing?* — asked by someone **holding
the artifact**. Everything below follows from making that query the spine.

---

## 1. The spine: asker-pull, keyed on the content itself

The atomic unit is **not** a "declaration record the creator owns and links to" (v1's
mistake). It is:

> **A verifiable statement, signed by an identity, about specific content, queryable by the
> content itself.**

Consequences:

- **The content is the key, not a database ID.** You look something up by the content's own
  fingerprint, so *anyone holding the bytes* can ask "who made this?" without the creator
  handing them anything. This flips the product from "creator distributes badges" to "the
  world can query any artifact."
- **The asker-pull path is the centerpiece.** Producer-push (registration, signing, SDK,
  git hooks) exists to *feed the resolver*. v1 inverted this.
- **"Spine" ≠ "what ships first."** Architecturally everything keys on content from day one.
  Go-to-market still seeds with producer-push + public-git bootstrap (see §8), because an
  empty resolver returns "no record found." Build for pull; seed with push.

### The resolver

Given bytes / a hash / a URL / a repo+path, return the provenance: the set of claims about
that subject, each with its tier, signer, time, and (for composite subjects) the rolled-up
view. Two lookup modes:

- **Exact hash → O(1) lookup.** For tamper-evidence and supply-chain.
- **Structural / fuzzy fingerprint → nearest-neighbor search.** For "this is substantially
  the code that was attested," surviving reformatting, renaming, and copy-paste.

> **Mission guardrail: name the creator; put the uncertainty in the tier.** The resolver always
> *answers* "who made this" — it names the contributors (human operators + AI models). It never
> abdicates with "no signal found"; how-sure-we-are is expressed through the **tier** (asserted
> → bound) and a caveat, not by withholding the answer. Absence of an AI signal is not proof of
> human authorship — that nuance is tier/caveat, not a refusal to name. (Companion: STRATEGY §5
> — *the badge is a headline+pointer; the full answer lives on the resolver page*.)

### The resolver page (what it presents)

The badge is a pointer; **this page is the answer** — and it answers the same spine of questions,
honestly, for any subject:

1. **Who?** — names every contributor (human operators + AI models) with their **role**
   (creator/editor/assistant/generator) and verified identity. Never "no signal"; always named.
2. **How sure?** — the effective **tier** per claim, with honest qualifiers (estimated/asserted) and
   methodology links for any computed view.
3. **Said vs. made** — authenticity ("we verified X *said* this") shown **distinctly** from
   origination ("X is established as the *origin*" — lineage + priority + native provenance). The
   honest answer to a valid signature over copied bytes (§11).
4. **Alone or contested?** — competing claims shown, **ranked by the evidence ladder**, each at its
   true tier; genuine ties shown as *open*, never a fabricated winner; weak/squatter claims render
   weak (no "disputed!" stigma on strong content); challenges and the (reopenable) dispute state
   visible (§11).
5. **From what / part of what** — the provenance graph: derivation lineage and the part-of roll-up
   with **provenance coverage** (% bound/verified/asserted/unattributed), recomputable from signed
   leaves (§6).
6. **Why** (when artifacts exist) — links to the motivating tickets / design docs / ADRs as **tiered
   edges** (declared vs. inferred), surfaced with their confidence (§6; STRATEGY §3).
7. **Verify it yourself** — the canonical claim, the signature, and the open verification recipe /
   reference verifier (`VERIFYING.md`). Genuineness = this page, not the badge image.

Design discipline (the mission guardrails): **altitude** — richness lives here so the badge stays
short; **name the creator, uncertainty in the tier**; the *who*-headline is **human/machine** (a
confidence gradient — provable-machine floor / unverified / attested-human), with the bot-vs-AI /
codegen-vs-generative detail **underneath**, never in the headline (`STRATEGY §3`); **celebrate
transparency, neutral on the human/AI ratio** (prestige in the tier mark, never the %); **show
conflicts, never fake a resolution.** The page is also the prime **conversion surface** — an unclaimed or contested page is
exactly where a real author is moved to verify-and-outrank (STRATEGY §4).

> **Progressive disclosure is a hard rule (review 2026-06-29, Concern B).** The 7 questions above
> are the *full* answer, not the *default view* — presenting all of them, over a 4-tier ladder, two
> evidence axes, divergence flags, coverage decomposition, and edge tiers, is a graduate seminar for
> a "who made this?" product. So the **default resolver view is one bold line — "Made by X" + a
> single tier mark** — and everything else (coverage decomposition, lineage, edge tiers,
> verify-yourself) collapses behind opt-in expanders. **Never render the two-axis
> authentication-vs-origination UI unless a conflict actually exists** — no divergence machinery on
> the ~99% uncontested page. The contention engine stays fully internal. **Concept budget: ≤ ~3 new
> terms per user-facing surface**; overflow is a design bug caught in review.

#### Neutral-tone semantics for the unclaimed page — carrot, never stick (decision, 2026-08-11)

The page is a conversion surface, which is exactly where a trust company can slide into the Glassdoor
**shame-to-claim** dark pattern. Hard rule, a *standing refusal* (like the ruled-out monetizations,
STRATEGY §6): **celebrate disclosure, stay neutral on its absence — "transparency you can *add*,"
never "shame you must *remove*."**

- **Default status is a neutral absence, not a verdict** — *"provenance not yet disclosed" /
  "unclaimed,"* **never** "hides its origins," "undisclosed AI," "untrustworthy," a red flag, a
  scarlet letter, or a failing grade. Absence = *not-yet-known*, not *concealment*.
- **No default negative score** — unclaimed reads *"not measured,"* never *"0 / F."* Positive marks
  for disclosure; neutrality (never negativity) for its absence.
- **Claiming is *adding*, not *fixing*** — *"add verified provenance,"* never *"clear your record."*
- **Any demand signal is producer-facing + informational, never a public pressure counter** — no
  *"N people are watching this undisclosed project"* display; that is the extortion play.
- **Consumer "unknown" is a limit of knowledge, not an insinuation** — *"we can't verify who made
  this,"* never editorialized toward suspicion.

**The structural safeguard — demand-generated, not crawled (falls out of asker-pull).** A per-subject
page exists **because someone asked** about that subject; we resolve queries and cache/index the
answer, we do **not** mass-crawl the world into unsolicited profile pages. *Answer questions, don't
build dossiers.* (The aggregate "State of AI Disclosure" index, §8, is separate and fine — it is
*statistics*, no individual targeting.) Combined with **factual-only + correctable + opt-out** and
the **consent-gate for name-attached** negatives (§8), this keeps the conversion surface honest
transparency rather than reputation extortion.

#### Public page: assert the determination, point to the identity — don't host it (decision, 2026-08-11)

Detect-don't-host, extended to the *person* axis (`STRATEGY §3`). The **public** resolver page shows
the **human/machine determination** and the committer's **@handle as a link-out** (to their GitHub /
the repo, where the identity is already disclosed) — it does **not** host a public profile/reach card
of the author. The full **profile + reach card is relationship/consent-gated**: shown to the **repo
owner** (their own repo), inside the **enterprise** product (the org is controller of its people's
data), or when the person has **claimed** their attribution (opt-in credit). This is the single
biggest PII risk-reducer (`COMPLIANCE.md`): the public corpus becomes aggregate stats + human/machine
determinations + pointers — never hosted dossiers on strangers.

---

## 2. Hashing: the hash is the *join key*, not the *trust*

The single most important distinction in the system:

> **A hash answers "are these the same bytes?" It does not answer "who made this?"**

The registry is, at heart, a map:

```
content-hash  →  { set of signed claims }  +  resolution policy
```

The hash is how the world *looks something up*. The signed claims are what answer "who made
this." When two identities claim the same hash (they will), **we order evidence** — by tier,
earliest signed timestamp, and lineage — **we do not adjudicate truth.**

### Multi-resolution fingerprinting (mandatory for code)

One artifact gets **several keys at different resolutions**; which you query by depends on
the question:

- **Exact layer** — git blob/tree/commit SHAs, raw `sha256`. Tamper-evidence, supply-chain
  integrity, "is this the signed artifact." Brittle by design.
- **Structural / fuzzy layer** — AST-normalized hashes, copy-detection fingerprints
  (winnowing/MOSS-style), fuzzy hashes (TLSH-type). Survives reformatting/renaming. Answers
  attribution, derivation, and "is this the same dependency" simultaneously.

### The two-hash invariant (do not violate)

There are **two different hashes**, and they must never be the same object:

1. **Content hash (subject fingerprint)** — git SHA / C2PA content hash / structural fp.
   This is the join key. We *ride* existing/native hashes.
2. **Claim hash (attestation integrity)** — the canonical hash of the attestation payload
   that the *signature* covers.

The envelope hashes **the claim, not the content.** The claim references the content by its
native hash:

> **INVARIANT: the subject of a claim is a *reference* to a native content hash
> (`{alg, preimage/target, value}`), never a re-hash of content into our own envelope.**

- **Good:** `subject: { alg: "git-blob-sha1", value: "abc123…" }` — we ride git's SHA, so an
  asker holding a git SHA finds the entry. The signature covers the claim, which cites the
  hash.
- **Bad:** ingest content bytes → produce a MadeBy-specific envelope hash → now our ID ≠ git
  SHA ≠ C2PA hash, and we've minted a competing content ID we can't resolve against.

This is what *lets* us ride existing hashes cleanly, and it shrinks the canonicalization
problem (see §3): we only canonicalize a small structured claim, never arbitrary content —
the native schemes already canonicalized the content; we quote their output.

Operational notes:
- Store content identity as `{algorithm, preimage/target, value}` and allow **multiple
  fingerprints per subject** (git SHA + sha256 + structural fp), so content is findable by
  whatever hash the asker happens to hold (git prepends a header to its blob preimage, so a
  raw `sha256` won't match a git-blob-sha1 — store both).
- For the **bound tier, incorporate the existing *signed* hash** (C2PA hard binding, signed
  git commit) rather than recomputing — adopt their content hash and signer identity, and
  layer our operator/legal/identity on top. Purest "ride where it exists."
- **Privacy:** "anyone holding the bytes can query" is a leak vector for proprietary code.
  Private subjects use salted/HMAC fingerprints and permissioned resolution, so the registry can
  confirm provenance to authorized askers without making private code world-queryable. **Implemented
  (#70):** `privateFingerprint(nativeFp, ownerKey)` = HMAC-SHA256 that blinds the native hash — same
  key+content matches, but the bytes alone never yield the lookup key, so hash-enumeration/confirmation
  fails without the key (`@madeby/core`, `private-fingerprint.ts`). Permissioned resolution (key
  distribution to authorized askers) rides the live registry (post-Atlas).

---

## 3. The attestation standard: semantics + swappable carriers

We do **not** pick one carrier format. Betting the standard on a transport is a losing bet.
Separate two layers (the JSON-LD / DID-method / media-type pattern):

- **The semantic standard** — *what a claim must say.* Defined once, carrier-independent.
- **The carriers (bindings)** — *how it's serialized* (in-toto predicate, SPDX profile,
  git-notes, …). A governed registry of these.

### The semantic core (invariant across carriers)

Every attestation, in any carrier, must carry:

- **Subject** — what content, at what granularity, anchored by multi-resolution fingerprint
  (exact + structural), *not* line numbers.
- **Attribution** — the identity. For AI: provider, model, version as **open fields (not a
  hardcoded enum** — v1's `AIModel` enum is the anti-pattern), **plus the operator** (the
  human/org whose key stands behind it).
- **Evidence + tier** — asserted / sworn / verified / bound, and the source (tool log,
  self-report, C2PA, Sigstore).
- **Signature** — operator key, timestamp, over the canonical claim.
- **Optional overlays** — sworn legal representation / rights assertion; lineage
  (derived-from).

### Canonicalization (the subtle, must-get-right piece)

A signature is computed over *bytes*. If the same claim serialized into two carriers
produces different bytes, the signature won't verify across them and the carriers silo. So:

> **The standard defines a canonical form of the claim that the signature is computed over,
> independent of carrier** (à la JSON Canonicalization Scheme / RDF canonicalization).
> Carriers are envelopes around a canonical, separately-signed payload.

Because the claim treats the content hash as an opaque string, canonicalization only has to
handle a small structured claim — never the content itself.

### The carrier registry + graceful degradation

A registry of known bindings, each with a parser/serializer, identified by a stable URI.
**Seed entries:** in-toto predicate (lean recommendation — signing-native, composes with the
Sigstore/SLSA rails), SPDX 3.0 AI profile (interop/BOM export), git-notes-native.

Unknown carriers are handled by **self-description + tier-capped degradation**:

- **Self-describing carriers** carry a stable identifier and a resolvable pointer to their
  schema/mapping (`@context`-style), so an unseen binding becomes *readable*.
- *Parse* vs. *verify* differ: you can read an unknown carrier's claim, but you can only
  verify the signature if its canonicalization is known/declared (you can't safely execute
  an arbitrary one).
- **This maps exactly onto the trust tiers:** known carrier → full verify → can reach bound
  tier. Self-describing with known canonicalization → verifiable. Fully unrecognized → parse
  and display, **capped at the asserted tier** with a "binding not recognized" flag. An
  unknown implementation degrades gracefully; it never breaks the system.

Governance is lightweight (media-type-registry style — who may claim a binding identifier).
The format itself is open and governed: an adopted open spec is a moat; a proprietary one is
a liability.

### The anchor registry: substrate-agnostic non-repudiation (design commitment, 2026-08-10)

Non-repudiation — *this claim existed at time T and the record wasn't altered* — is the layer
MadeBy owns (`STRATEGY.md §2`). But it must not be welded to one ledger, exactly as the claim is not
welded to one carrier or one identity provider. Being a Rekor client is not a protocol; being
**ledger-agnostic** is.

- An **`Anchor`** = `{ substrate, proof, anchoredAt }`, sitting beside `Signature` in the model. An
  open **anchor registry** — a sibling of the carrier registry above — holds, per substrate, how to
  *produce* and *verify* its inclusion/timestamp proof.
- **Rekor is one backend among several:** an **RFC-3161 TSA** (decades-old, already legally
  recognized), a Certificate-Transparency-style log, decentralized timestamping (OpenTimestamps →
  a chain), and the **signed public git commit** we already have as a weak-but-real anchor.
- **Multi-anchor by default:** a claim may be anchored to several substrates at once; its
  non-repudiation is as strong as the **strongest surviving** one.
- **Fail-safe / graceful degradation (invariant #3 analog):** an unknown or unverifiable anchor is
  parsed but not trusted → caps at asserted. If a ledger *loses*, an anchored claim **degrades, it
  does not die** — re-anchor to a live substrate; a multi-anchored claim never lost non-repudiation;
  the claim's semantics + signature + legal overlay persist regardless. Ledger death ≠ orphaning.
- **Agnostic ≠ flattened:** each substrate has different strengths (Rekor = public auditability; a
  TSA = legal weight; a chain = censorship-resistance). Surface the *kind* of proof per anchor — the
  way a carrier carries `verificationCapable` — never pretend all anchors are equal.
- **Orthogonal axis:** non-repudiation (unanchored → multi-anchored → legally-recognized) is
  independent of authentication (asserted→bound), the same way the legal axis is orthogonal to the
  crypto axis (`STRATEGY.md §2`).

**Build note (not now):** ship the anchor-registry *harness* plus the two cheapest, most-neutral
backends first — the **RFC-3161 TSA** (legal-friendly) and the **signed-git-commit** weak anchor we
already hold; add Rekor/chains later through the registry. Backends are post-Tier-2 (`OPERATIONS.md
§4a`); this section fixes the *shape* so we never build ourselves into a single-ledger corner.

### The default profile + derived-records reporting (design commitment, 2026-08-10)

The agnostic layers (identity, carrier, anchor) are a *capability to reach for*, never a
*configuration to force*. So the product ships one opinionated **default profile** that gives the
easy-button path zero choices: identity = the git/SSO identity already present; anchor = a public
default (the signed-git-commit + a public RFC-3161 TSA — *never* a MadeBy-proprietary ledger);
carrier = `.madeby`; reporting = madeby.fyi. `madeby init` / the zero-config Action apply it. **Rule:
offer every choice, default to none** — never ship a default that makes an engineering team pick a
ledger or stand up an identity (engineering is the implementer, rarely the buyer — `STRATEGY.md §6`).

**Derived-records reporting — the data path to the hosted dashboard.** Dashboards are hosted
(madeby.fyi); no one installs on-prem software to view a chart. But source must never leave the org.
Resolution: the CLI/Action runs **inside their CI/perimeter** and emits only **derived provenance
records** (Disclosure Scores, attestation commitments, anchor references, grant/policy state — never
source) — the same "only derived attribution leaves the machine" principle as `capture-local` and
the §8 enterprise-isolation posture. Egress is the customer's (push, not pull) and tiered:
**aggregate-only → blinded records** (the HMAC-blinded private fingerprint, keeping hashes
non-cross-referenceable) **→ full**. Air-gapped orgs run local-only (no hosted dashboard — their
tradeoff). Store = the Tier-2 registry (`OPERATIONS.md §4a`); render = madeby.fyi.

**One mechanism, three jobs.** The zero-choice default *is* the data pump: running the gate in CI
(which they do anyway) frictionlessly adopts the protocol, ships derived provenance to the dashboard,
and — because it is the default — concentrates data at the hosted resolution/grant layer (the moat,
`STRATEGY.md §6`), all without our holding identity, ledger, or source.

**Local reader vs hosted resolver — there is no local daemon or DNS.** Two distinct things must not
be conflated (both were loosely called "resolver" and shouldn't be). The **local reader** (the CLI,
the Action, an IDE extension) is *plain file I/O*: after a `git clone` / `npm install`, a `.madeby`
is on disk (in-tree or `node_modules/<pkg>/`) and is read like `package.json` or `LICENSE` — nothing
listens, nothing is contacted. The **hosted resolver** (madeby.fyi) is a *separate* network API for
the asker-pull, **query-by-hash** case — used only when you hold a *hash but not the artifact* (or as
a fallback when a package didn't ship its `.madeby`). So: **have the tree → local file read + offline
verify (no network); have only a hash → hosted resolver (network); want current-validity/reputation →
optional call to the authority the file's pointer names.** The base read-and-verify never needs a
server; the network is only for hash-only lookups and optional enrichment.

**The `.madeby` carrier is also the read/verify surface (not just a store).** Because a package ships
its `.madeby` and a repo carries it in-tree, the provenance **travels with the code** — **artifact-
scoped, not a broadcast**: it rides the *specific artifact* it describes wherever that artifact is
copied/installed/forked. **Cross-repo by default** (vendoring, monorepo, submodule, clone);
**cross-org only** via a **published package that includes `.madeby`** (installed by another org) or
a **fork/clone** another org pulls — so cross-org density is shaped like the **dependency graph** (you
accumulate provenance for what you actually depend on), which is exactly what the supply-chain
reliance products need. (Distinct from the org-scoped *reporting-push* path, `OPERATIONS §4a` — that
is how records reach an authority, not how files travel between consumers.) A consumer thus reads a
dependency's provenance from files it *already has*, with no hosted
UI or API placement (this is what un-gates the "provenance score in review/registry/IDE" — it's an
in-tree local read; `STRATEGY.md §6`). Two properties make the traveled file trustworthy without a
network: it's an **open format**, and it's **offline-verifiable** — the two-hash invariant binds each
claim to the *bytes actually received*, so a dependency cannot ship a `.madeby` that over-claims and
still verifies. The gate (fail-the-build) and the score (display) are then the **same in-tree read**,
different rendering. **What the traveled file cannot carry is *current validity*** — it is a
publish-time snapshot, so **revocation / current-state is deferred to the authority** (madeby.fyi,
the OCSP-shaped responder over the anchor/grant record). Static claim + offline signature = local;
"is it still valid now" = a live authority check — and that freshness check is the continuous query
traffic to the moat surface. Default-profile requirement: ensure `.madeby` is **published with the
package** (the `files`/ignore defaults) so provenance actually travels.

**Travel and the registry are complementary halves of one content-addressed system, joined by the
hash.** Travel is local and artifact-scoped — it can't help with an artifact you hold whose `.madeby`
*didn't* travel (a package that omitted it, a bare binary, a pasted snippet). The complement is the
**hash-addressable registry** — the asker-pull spine (§2, *hash = the join key*): producers and the
CI collector **push `.madeby` records keyed by the artifact's content hash** to an authority (public
→ public madeby.fyi; private → the org's workspace), so anyone holding the artifact can **hash it and
resolve provenance even when the file didn't travel.** The *same record* is thus reachable two ways —
**locally if it traveled, by hash-query if it was registered** — and the traveled file's authority
pointer names the registry to query for the live view. Guardrails keep it consistent: **we host
provenance records/pointers, never source** (the record references content by hash); a pushed record
is **asserted-until-verified** (the registry coordinates *discovery*, it does not confer trust —
consumers still verify offline + resolve the tier, fail-safe); matching is **multi-resolution**
(exact hash + the fuzzy/structural fingerprint, §2, so reformatted/edited copies still resolve where
travel only carries the exact file); and density is **participation-scoped, not a crawl** (the
registry holds what is pushed, same honesty caution as travel). This is the deferred **Tier-2 store**
(`OPERATIONS §4a`) and the default-gravity moat surface, now concretely motivated.

**The file carries an optional authority pointer, so renderers enrich from our API.** The `.madeby`
file includes a **resolver/authority pointer** (default: madeby.fyi; swappable) so a renderer reading
the local file knows *where* to fetch live context the static snapshot can't hold — current validity /
revocation, aggregate reputation, cross-graph context, grant state. Three properties: **(1)
enrichment is optional, never required to verify** — the base claim still verifies fully offline
(two-hash + signature), so a network-less renderer still works ("don't trust us, verify" preserved,
graceful degradation); **(2) the pointer resolves against wherever *that artifact's* records live —
data-locality, not a new rule** — it follows directly from the CI-as-collector reporting model
(records go to the workspace you reported them to). Public artifacts point at public madeby.fyi; an
org's *own private* artifacts point at the org's *own* workspace, because that is simply where their
records are. (So a private repo still queries the public authority about its *public* dependencies —
correct and desirable; only the org's own private artifacts stay in-boundary. The privacy benefit
falls out of data-locality; where a query does reach a shared authority, the **HMAC-blinded
fingerprint (#70)** lets it answer without learning the real hash — the OCSP-privacy mitigation, an
option not an absolute.) **(3) agnostic + default-gravity** — the pointer is a swappable authority
reference, but the *default* is madeby.fyi, so the ubiquitous `.madeby` files reference our authority
by default and every enrichment/validity call routes to us. **This is where default gravity concretely
lives in the carrier:** the default carrier points at the default authority — a continuous-traffic
link to the moat surface, riding a file that travels with each artifact to that artifact's consumers.

### The sworn carrier: self-hosted declarations, we detect and point (decision, 2026-07-06)

The `sworn` tier is *"no crypto binding, but legally consequential"* (`packages/core/src/tiers.ts`).
The legal force comes from the **declarant adopting standardized declaration language** — not from
us hosting it. Hosting third-party legal representations was only ever the *liability* of the sworn
tier, never its *mechanism*. So we don't host them. **We publish the instrument; the user self-hosts
the declaration in their own repo; we detect it and store a pointer.** This is the OSI/SPDX model
applied to attestation (OSI publishes license *text* — its own speech; repos adopt it; `licensee`
*detects* and points), and it makes MadeBy a **detector/indexer, not a publisher** of others' claims.

- **The instrument** — a canonical, **versioned** attestation template we publish openly (a
  `MADEBY-ATTESTATION-vN` text with an SPDX-style identifier), carrying the legally-operative
  declaration language. Publishing our own template text is low-liability, like publishing a license.
- **The carrier is the user's repo.** They commit a declaration file (e.g. `PROVENANCE` /
  `.madeby/attestation`) that **references** their `.madeby/` manifest (two-hash invariant #1
  preserved — the declaration points at the native content hash, nothing re-hashes into our
  envelope). This is a new self-describing carrier in the registry above.
- **We store a pointer, never a copy** — `(repo, commit SHA, path, template-version-id,
  hash-of-detected-text)`. Detection is **canonical-text match** (same discipline as license
  detection and the trailer classifier): hash the *legally-operative body* (whitespace-normalized;
  fill-in fields — name, date, scope — excluded from the hash). Altering the oath wording breaks the
  match, so a declaration cannot be watered down and keep its tier.
- **Signature-attachable by design — legal first, cryptographic optional.** The template carries a
  **legal signature block**: the declarant signs it (typed name + declaration + date, e-signature-
  equivalent). This *legal* signature — not a cryptographic one — is what makes the statement
  consequential (misrepresentation/perjury exposure) and is the sworn tier's actual mechanism,
  consistent with `tiers.ts` ("no crypto binding, but legally consequential") and STRATEGY §2 (the
  orthogonal legal axis: bind the claim to *a person who bears consequences*, no cryptography needed).
  A **cryptographic** signature (signed commit, or a detached signature over the canonical
  declaration bytes — invariant #2) is a welcome *addition*, not a requirement: it further binds the
  declaration to a checkable identity and is the clean, in-band **upgrade path to `verified`** with no
  format change.

**Tier mapping (fail-safe / invariant #3):**

- Recognized declaration text, **legally signed by an identifiable party** (repo self-attestation) →
  **sworn**. Legal signature + identifiable declarant; no cryptography required.
- **+ a valid cryptographic signature** by a checkable/known party → **verified**.
- Modified/unrecognized text, or no identifiable signatory → capped at **asserted**, flagged
  "declaration not recognized / declarant unverified." (Whether the legal signature alone clears the
  sworn bar in a given jurisdiction is a counsel question — see `COMPLIANCE.md`; the sworn *launch*
  stays counsel-gated.)

**What this buys:** takedown is trivial and fail-safe — the declaration lives in *their* repo; they
delete the file → next asker-pull detects its absence → the pointer degrades to `asserted`; we never
held a copy to be asked to remove. We point to a *fact* ("repo X at commit Y contains declaration
vN"), we don't reproduce their claim — an intermediary posture, not a publisher's. Only the
sworn *launch* waits on counsel, whose scope shrinks from "regulate a hosting regime" to "vet our
template wording + the detector/pointer disclaimer."

**Reference implementation (landed).** `packages/core/src/declaration.ts` is the detector: a
versioned template registry, canonical-operative-text hashing (recognition survives whitespace
drift but not wording changes), signature-field extraction, and the fail-safe `declarationTier`
ladder. The published instrument is `packages/core/templates/MADEBY-ATTESTATION-v1.md`.
`resolveTier` gained a `recognizesSwornRepresentation` gate so the trust-critical path caps
unrecognized/draft representations at asserted (mutation-tested). The analyzer
(`packages/analyzer/src/declaration.ts`) reads a self-hosted declaration from a repo and produces
the **pointer** (path, template id, signatory, tier) — folded into the mirror. **The counsel gate
is a code fact:** the v1 template ships with `status: 'draft'`, so a perfectly-formed signed
declaration is *detected and pointed to* but still resolves to `asserted`; finalizing the wording
flips status → the sworn tier unlocks with no other change.

### The disclosure policy carrier + `madeby check` (the maintainer gate, the light way)

The OSS-maintainer wedge (`STRATEGY.md §3`) needs **no GitHub App and no hosted backend** — the
heavy thing we explicitly don't build. The carrier is a file: **`.madeby/policy.json`**, in which a
maintainer declares their disclosure policy:

```json
{ "version": 0, "mode": "required" | "advisory" | "off", "accept": ["dco-signoff", "ai-trailer", ...] }
```

`mode: required` fails the gate on any commit that discloses nothing the policy accepts; `advisory`
reports only; `off` (and the fail-safe default for a missing/malformed file) never gates. `accept`
omitted ⇒ any recognized disclosure counts. The evaluator is pure, node-free core
(`packages/core/src/policy.ts` — `parseDisclosurePolicy` + `evaluateDisclosurePolicy` over each
commit's `commitDisclosureKinds`), so the same logic runs on the mirror, in the index, and in the
gate. **`madeby check [<range>]`** (`scripts/madeby-check.mjs`, run under Node type-stripping — no
bundling) reads the policy, recognizes each commit's disclosure (AI trailer / DCO sign-off /
signature), evaluates, prints a summary, and exits non-zero only under `required`. It runs anywhere:
a contributor's laptop, one `run:` line in any CI, or a thin `uses:` Action later.

Two invariants hold the line: **disclosure, never detection** (the check asks contributors to *state*
origin; it never asserts whether code is AI), and **the maintainer owns the policy** — if a project
turns a `required` gate into a de-facto AI ban, that is its call; we ship the neutral instrument and
neither advise nor obstruct. Fail-safe throughout: a parse error or our own bug degrades to `off`
(never block a PR on our error, never invent a stricter gate than the maintainer wrote).

**Packaging (landed).** `scripts/*.mjs` are the no-build dev entries; the installable form is
`packages/cli` — the `madeby` package, esbuild-bundled into a single standalone `dist/madeby.mjs`
(bundling sidesteps the type-stripping import constraints), exposing `madeby check` and
`madeby prove`. `packages/action/` is the thin composite Action that runs `npx madeby check` on a
PR — so a maintainer adopts the whole wedge by committing two files (`.madeby/policy.json` + a
workflow). The one remaining outward step is `npm publish` of the `madeby` package (owner's call);
until then the CLI runs locally and the Action manifest is inert.

---

## 4. AI span-demarcation convention

No standard exists for span-level AI authorship ("lines 40–52 by model X, operated by Y").
Commit-level conventions do exist — **ride them**; span-level we **define** (openly,
preferably as an in-to​to predicate type so it inherits the ecosystem's credibility).

- **Commit level:** ride `Co-Authored-By:` trailers (already emitted by Claude Code/Copilot)
  + signed commits; map the trailer identity to a verified MadeBy identity. `@generated`
  marks fully-generated files.
- **Span level — three design commitments:**
  1. **Out-of-band and content-anchored, not inline comments.** Inline markers get stripped
     by formatters, clutter source, can't be cleanly signed (signature inside the signed
     bytes = circular), and are pinned to line numbers that drift. Instead: a signed
     manifest (git-notes ref or `.madeby/` sidecar) where each span is anchored by its
     **structural fingerprint**, reusing the fuzzy-hash layer — so authorship survives the
     file moving around it.
  2. **The operator's key signs, not "the AI."** A span record reads: *generated by model M
     (provider, version), attested+signed by operator O's key, at time T, tier*. The legal
     overlay can attach the sworn tier (rights/assignment), which is what makes it useful for
     the clean-IP / licensing story.
  3. **Model-agnostic by construction** — any agent (Copilot/Cursor/Gemini/…) must be able to
     emit it. The agent is the *witness at generation time*; the convention is a contract its
     tooling fills on write.

**Snippet travel:** an out-of-band manifest detaches when bytes are copied elsewhere. We do
**not** solve this with inline pollution — we solve it with the registry's **fuzzy-fingerprint
resolution** (paste the snippet → resolve by structural fingerprint). (Revisit only if
"attribution must survive a raw copy-paste of bytes" becomes a hard requirement.)

---

## 5. Identity: public-key-centric, with an operator chain

One key pair per producer identity does **triple duty**: signs content (proof tier), anchors
a self-sovereign identity (DID-style — arguably a better substrate than email round-trips),
and can receive value (wallet — as an *identity anchor*, not a payment feature).

- **Verified anchors** (carried from v1, which got this part right): email, domain, phone,
  postal address — plus public key / wallet. Each is an independently verifiable attribute.
- **The operator chain** matters for AI: "made by AI" is incomplete; the useful answer is
  "made by *model M*, operated by *verified person/org O*." v1's `operator` relation is one
  of the better ideas in the old schema and survives.
- **Identity types:** individual, organization, AI (model + version + operator).

We generate **the verified attribution graph with payable identities attached** — the input
a funding protocol needs. We do not process payments (see `STRATEGY.md` §3).

### Portable reputation credentials (contributor-controlled)

Because identity is key-anchored and self-sovereign, a contributor's **authorship travels with them,
not with the employer** — the org owns the code (IP), the person holds the attribution (§11). We
expose this as a **holder-controlled verifiable credential** over the DAG (§6): subject = the
contributor's key/DID; issuer = MadeBy and/or the **org's verified identity**; claim = authorship of
subject(s) at a tier, under a *labeled view* (percent is a computed view, never ground truth — §6).

- **Selective disclosure — ride the standard.** Express it as a W3C Verifiable Credential with
  selective disclosure (SD-JWT / BBS+), so the holder reveals only chosen fields and can prove
  *predicates* — "I authored ≥ 50% of X" — **without revealing the content**. Existence, magnitude,
  and specific spans are independently disclosable. This is the privacy-preserving form of "prove I
  wrote 60% of a payments system": the bytes never leave the org.
- **Private work travels via org co-signature.** For proprietary code the org (which owns the bytes)
  co-signs the authorship *fact* while withholding the content — a `verified`-tier credential with no
  IP leak, in both the org's interest (alumni goodwill, retention) and the contributor's.
- **A pointer to the living record, not a frozen verdict.** A credential references the live claims;
  a later dispute (§11) is reflected, and credentials are re-checkable / expirable — never an eternal
  "proven" snapshot (same discipline as the badge: a pointer, not standalone proof).
- **The contributor controls disclosure** — the concrete form of the credit-not-surveillance
  guardrail (§6): your reputation graph is yours to export selectively, never a dossier others
  assemble about you.

A verifiable portfolio is also a single-player cold-start hook (`STRATEGY.md` §3/§4): reason to pull
your work into MadeBy regardless of whether the network yet exists.

---

## 6. Composition: the provenance DAG

Because a claim is itself content-addressed, **a claim can reference other claims** → a
Merkle-DAG of provenance. This is how "who made this codebase" is answerable when the honest
answer is plural. (Same pattern as C2PA *ingredients* and in-toto *materials→products* —
ride it, don't reinvent.)

- **Containment mirrors code:** span ⊂ file ⊂ commit ⊂ release ⊂ codebase. Attribution
  aggregates *up* the tree, and a consumer can **recompute the roll-up from signed leaves
  without trusting the aggregator** — tamper-evident all the way down. Attach to **git's
  existing DAG**; overlay identity/signature/tier rather than building a parallel tree.
- **Two edge types — keep distinct:**
  - **Composition (part-of)** — within a codebase; aggregation flows up.
  - **Derivation (derived-from)** — across codebases (fork/refactor/snippet-from-elsewhere,
    AI-generated-by-model). Traces provenance *backward* across repo boundaries (git's DAG
    can't express this). The edge that powers supply-chain + licensing + "did the model
    regurgitate GPL code."

### Edges are claims, too — tiered and extensible

An edge asserts that *A relates to B*, so it is a claim like any other and **carries a tier**: a
`Closes #123` trailer or a signed link is a *declared* (high-confidence) edge; a semantically-
inferred "this module implements that design doc" is an *asserted* (low-confidence) edge, surfaced
with its evidence and **never as false certainty**. This is the tier honesty of §2–§3 applied to
*relationships* — fuzzy connections aren't hidden, they're low-tier. The edge-type set is an **open
registry**, not a fixed enum (same discipline as carriers/algorithms):

- `PART_OF`, `DERIVED_FROM` — the code-native pair (above).
- `DISPUTES` — a contradiction / counter-claim (§11).
- `IMPLEMENTS` / `MOTIVATED_BY` / `DECIDED_BY` / `DISCUSSED_IN` — link code to the **management
  artifacts that shaped it** (tickets, PRs, design docs, ADRs) — the *why* layer and the first
  non-code frontier (`STRATEGY.md` §3). These edges are usually inferred, hence tiered.

### What the DAG enables (one graph, many lenses)

The DAG is the durable asset: tiers and badges are how content *enters* it; the following are how
value *comes out*. Each is a computed view over the same graph (cf. the index's "one engine, two
surfaces", §8):

- **Fair credit / invisible labor.** `git blame` attributes the last toucher; the DAG preserves the
  *originator* across moves/refactors, records non-author roles (reviewer/`editor`/`assistant`), and
  follows cross-repo reuse — surfacing contribution the crude metrics erase.
- **"Who do I ask?" expertise.** Origination-weighted (not last-touch), blended with recency, and
  degrading gracefully when the originator has left. Powers navigation, review-routing, onboarding,
  incident response.
- **Contributor-portable reputation.** A verifiable, self-exported authorship record that travels
  across employers — including a **privacy-preserving** form ("prove I authored 60% of X" without
  revealing the content). Authorship travels even though the org owns the code (§11).
- **Org / manager views** (the paid org index, §8): collaboration topology, **bus-factor / key-person
  risk**, AI-leverage and human↔AI co-creation *patterns* (via roles + operator chain), M&A and
  individual due diligence.
- **Ecosystem lineage** (`DERIVED_FROM` across repos): license/vulnerability propagation,
  AI-regurgitation tracing, and influence ranking that credits foundational work at ecosystem scale.
- **Attribution-weighted splits**: the verifiable contribution split a funding/rev-share rail needs —
  we compute it; someone else moves the money (not the bank).

> **Guardrail (firm): the DAG illuminates contribution for credit and understanding — never to
> surveil or rank individuals.** Favor self-directed individual insight + team/aggregate health
> signals; refuse the per-engineer productivity score (toxic, Goodhart-prone, off-brand for a
> fair-credit company). The contributor controls disclosure of their own graph. An ethical commitment
> *and* a positioning moat.

### Provenance coverage (the headline metric)

Aggregating a tree of mixed tiers gives a codebase a measurable, verifiable **provenance
profile** — like test coverage, for authorship:

```
This release: 87% provenance-covered — 60% bound, 27% verified, 13% unattributed.
AI-generated: 22%, all operator-attested.
```

Serves both go-to-markets: a CI badge a vibe-coder shows off, *and* a supply-chain risk
metric a CISO gates on. It surfaces the *unattributed* fraction honestly.

### Modeling constraints

- **"Percent authored by" is a contestable *view*, not ground truth.** Lines/tokens/bytes/
  semantic-significance all give different answers and are gameable. The **primitive is the
  set of attributed units + fingerprints**; percentages are computed at the edge, labeled as
  views. Never enshrine a single hardcoded "%".
- **Pinned-immutable vs. living-mutable.** A release/commit claim is *immutable* (pinned to
  specific content hashes, signable forever). A "codebase" view over a moving HEAD is
  *mutable* (recomputed as commits land). Keep distinct or every new commit invalidates the
  parent's signature.
- **Ship the two-level case first** (leaf commit/span → release roll-up). Allow arbitrary
  recursion in the schema; don't build a general recursive graph engine on day one.

---

## 7. Standards posture

> **Ride a standard where one exists; extend into the gap where it doesn't; own identity +
> resolver + legal everywhere.**

| Domain | Ride | We add |
|--------|------|--------|
| Images/video/PDF | **C2PA / Content Credentials** (signed manifests, ingredients) | verified signer identity, resolver for stripped manifests, legal/sworn layer |
| Code provenance | **Sigstore, SLSA, in-toto, npm provenance** | AI/human span attribution, identity, resolver, legal layer |
| AI-in-software disclosure | **SPDX 3.0 AI profile** (interop/export) | span granularity, operator chain |
| Code spans (no standard) | — | **define** the span convention (open, in-toto predicate) |

Manifests get stripped constantly (social platforms re-encode uploads; tooling drops
metadata). The **resolver is the fallback** that makes provenance survive stripping, keyed on
the content fingerprint — a core reason the asker-pull/registry exists alongside embedded
provenance.

Every "we add" capability above is a **symmetric plugin** a third party (or their AI) can author —
and the host is itself an adapter, with nothing host-specific in `core`. See §12 for the extension
model this posture implies.

---

## 8. Cold-start: continuous public-git ingestion, and the index

The world's public git history is already a **content-keyed, authorship-annotated dataset**
(every public commit has an author, timestamp, content-addressed snapshot). A **continuous
ingestion pipeline** mines it, producing both per-subject claims and aggregate indices.

> **The concrete spec is `OPERATIONS.md §4b` (the metadata corpus, "tier 3").** Metadata-only
> (identity/trailers/signatures/paths — *no content*), GH Archive + BigQuery, bounded/sampled,
> Neon-backed; it powers cross-repo reach reads, the human/machine index, and demand-generated
> discovery pages. Ingest for aggregates + cross-reference; keep per-subject pages demand-generated
> and neutral (§1 #117); PII/GDPR is counsel-gated. The content-fingerprint corpus stays deferred.

- **Auto-populate the asserted tier** by ingesting public repos → the resolver returns
  *something* (unverified, "git blame + heuristics say X") from day one, before anyone opts in.
- **Verified / sworn / bound tiers are opt-in upgrades** layered onto entries that already
  exist. The flywheel starts from all of open source, not from zero.
- Substrate for the **"analyze your existing git history" wedge** and the public **resolver
  pages** that drive SEO (see `STRATEGY.md` §4).
- The vibe-coding angle clicks in here: the AI tool's session log **upgrades** an asserted
  git-blame claim to evidence-backed span attribution, keyed on the same hashes.

> **Consent gate (review 2026-06-29, Finding 3 — launch blocker, not afterthought).** Publishing
> a public, indexable, **name-attached** "who made this — N% AI" page about a developer who never
> opted in — from a heuristic that's frequently wrong — is uniquely corrosive for a *trust* brand
> and carries GDPR exposure (inferred personal data). So: **ingest broadly, but gate the public,
> name-attached AI-inference page behind a claim** (or owner-connected allowlist). **Pre-claim,
> show only the neutral "who"** (git authors), never an AI-% headline. The public index ships
> **aggregate-only — never a per-individual "X is an AI coder" page.** Build the salted/HMAC
> **private-fingerprint scheme** (specced in §2, currently absent from schema/code) so private
> content isn't enumerable, and ship a self-serve **opt-out + takedown** endpoint + `privacy@`
> before the first public ingestion. (Tracked as a launch-blocker ticket; legal pack in
> `COMPLIANCE.md`.)

### The index as a computed aggregate view (one engine, two surfaces)

The "State of AI in Open Source" page is a **global `CoverageView`** — the same roll-up
machinery from §6 (provenance coverage: tier distribution, human/AI mix, trends over time,
breakdowns by language/ecosystem), computed over the whole ingested corpus and refreshed
continuously rather than over a single Subject's claim tree.

Crucially, **the index engine is corpus-agnostic** — point it at public git and it is the
free authority/marketing asset; point it at **a single org's private repos** and it is the
internal provenance dashboard enterprises want ("how much of *our* codebase is AI-written;
what's our provenance coverage; which dependencies are unattributed"). Same computation, two
surfaces:

| Surface | Corpus | Role |
|---------|--------|------|
| Public index | All public git | Authority moat, evergreen PR/SEO, top of funnel |
| Org index (private) | A customer's repos | Productized enterprise dashboard (supply-chain / compliance monetization line) |

Build the aggregation engine once; the public index is the marketing instance and the org
index is the paid instance. This is the index analog of the badge being "skinnable" per
audience.

> **Honesty invariant for aggregates:** the global/public number is an *estimate*
> (asserted-tier, heuristic). As a trust product, our own headline metric must model the
> tier-honesty we sell — label it estimated, publish the methodology, show confidence. An
> aggregate is computed over claims of mixed tiers and must surface that tier distribution,
> never a bare number implying certainty.

---

## 9. The badge (technical)

- **Live-served** from `madeby.fyi/b/<owner>/<repo>.svg` — rendered from real data, not a
  forgeable static file.
- **Always linked** to the authoritative resolver page (markdown image-inside-link form):
  `[![madeby.fyi](https://madeby.fyi/b/owner/repo.svg)](https://madeby.fyi/owner/repo)`.
- **Pointer, never proof.** Genuineness = follow the link to the authoritative subject page,
  which shows the signed claims, tiers, and verified identities. Forgery is self-defeating.
- **Headline content (v0):** named AI collaborators + a **provenance-coverage** mark, with any
  ratio labeled "% of commits with AI involvement" — **not** an implied code split (review
  2026-06-29, Finding 1; `STRATEGY.md` §5). The precise mix-led lines/tokens ratio is reserved for
  the tiers where span evidence exists. Tier gradient lives in the **trust mark**, not aesthetic
  quality; the honest qualifier doubles as the upgrade pull.

---

## 10. Proposed entity model (first sketch, not final)

Deliberately small — resist v1's speculative breadth. Open string/registry fields over rigid
enums where values churn (models, providers, carriers, algorithms).

- **Subject** — a piece of content. Has many **Fingerprints** `{algorithm, target, value}`
  (multi-resolution). The resolver's lookup key. Code-first but not code-only: management artifacts
  (tickets/PRs/design docs) and media are subjects too, fingerprinted by the same machinery
  (structural handles prose; C2PA covers media).
- **Identity** — individual / org / AI. Has verified **Anchors** (email, domain, phone,
  address, **public key / wallet**). AI identities have provider/model/version + **operator**
  (→ Identity).
- **Claim** — *the core object.* References a Subject (by Fingerprint, never re-hashed),
  asserts an **Attribution** (Identity + role; for AI, model + operator), carries a **tier**,
  a **canonical payload**, and a **Signature**. Is itself content-addressed (claim hash) so
  Claims can reference Claims.
- **ClaimEdge** — a typed, **tiered** link between claims/subjects (an edge is itself a claim;
  inferred edges carry a confidence tier and surface their evidence — §6). **Open type registry:**
  `PART_OF`, `DERIVED_FROM`, `DISPUTES` (§11), and the code↔artifact types
  (`IMPLEMENTS`/`MOTIVATED_BY`/`DECIDED_BY`/`DISCUSSED_IN`) for the non-code frontier.
- **Carrier** — registry entry: identifier + parser/serializer + canonicalization ref +
  whether it supports full verification (→ tier cap).
- **LegalRepresentation** / **SwornAttestation** — optional overlay on a Claim (the sworn
  tier; rights/copyright assertion). Carries a legal-text snapshot at signing time.
- **CoverageView** — a *computed, mutable* roll-up (provenance coverage %, tier distribution,
  human/AI mix). A view, not ground truth. Scope is parameterized: a single Subject's claim
  tree, **an org's private repos** (enterprise dashboard), or **the whole public corpus**
  (the "State of AI in Open Source" index). Same engine, different corpus (§8).

### Invariants to enforce in code

1. **Subject is a reference to a native content hash, never a re-hash into our envelope.** (§2)
2. **Signatures cover the canonical claim payload, independent of carrier.** (§3)
3. **Unrecognized carriers / unverifiable signatures are capped at the asserted tier.** (§3)
4. **The badge image is live-served and always linked; it is never treated as standalone
   proof.** (§9)
5. **The act of attribution is free; we order evidence and never assert truth.** (strategy)
6. **"Percent authored" is a computed view over attributed units, never a stored ground
   truth.** (§6)
7. **Aggregate indices (org or public) surface their tier distribution and are labeled
   estimates with published methodology — never a bare number implying certainty.** (§8)
8. **Contention is ranked by evidence across two independent axes** (authenticity tier +
   origination), never resolved by fiat: a claim is the origin only if it **dominates** (≥ on both,
   > on one); priority is a weak tiebreaker that never overrides stronger evidence; genuine
   trade-offs/ties are surfaced as open conflicts. (§11)
9. **No identity-based precedence and no suppression:** a verified/enterprise identity never
   wins by status alone, and competing claims are ranked + labeled, never deleted. (§11)
10. **Tier authenticates the statement and signer, not authorship;** origination rests on
    lineage + priority + native provenance — a valid signature over copied bytes does not
    establish origin. (§11)
11. **Extensions are capped by these invariants, not trusted to honor them.** Any plugin
    (adapter / carrier / anchor / recognizer / identity provider / lens / edge) emits evidence at an
    `asserted` ceiling; only the core escalates tier. Executable plugins are capability-scoped and
    cap the tier until vetted; declarative plugins are open. No plugin may infer origin from style,
    host person-PII, or emit a per-person score. (§12)

---

## 11. Conflicts, false claims & ownership

Contention is just **uncertainty about *who***, handled the way we handle every uncertainty:
order the evidence in public, label confidence honestly, never resolve by fiat. We rank; we do
not adjudicate.

**Two questions, two claim types — keep distinct.**
- **Authorship / origination** — *who made it.* An Attribution claim (Identity + role).
- **Ownership / rights** — *who holds it.* A **legal/sworn** claim. Diverges from authorship under
  work-for-hire, acquisition, or license — both are recorded without conflict (employee authors;
  org owns). This, not an authorship argument, is the enterprise's primary object.

**Authentication ≠ origination (load-bearing).** A signature proves *who said something over which
bytes* — statement authenticity (the `verified`/`bound` tiers). It does **not** prove authorship: a
bad actor can verify their own identity and sign a claim over *copied* bytes, reaching `bound` on
the statement. Origination is a **separate axis** — **lineage** (upstream history / `DERIVED_FROM`),
**priority** (earliest tamper-evidently-logged claim), and **native provenance** (the artifact's own
git/C2PA record). The resolver surfaces these distinctly: "we verified X *said* this" is not "X is
established as the *origin*."

**Ranking among co-located claims (deterministic, published) — by evidence, across two axes:**
- **Authenticity (tier)** — "we verified X *said* this" (bound > verified > sworn > asserted).
- **Origination** — "X is the *origin*": lineage + native provenance, with **priority** (earliest
  logged) as a weak tiebreaker. First-to-register ≠ first-to-create; priority is a signal, never proof.

A claim is the established origin only if it **dominates** — ranks ≥ on *both* axes and strictly
higher on one. These axes are **independent** (invariant #10): tier does not dominate origination,
so a valid signature over *copied* bytes (high tier, derivative origination) never out-ranks the
true origin — it surfaces as **open + divergence**, not a crowned impostor. When no claim dominates
— one better-authenticated, another better-originated, or genuinely equal evidence — the contention
is **open**: shown with both axes, the divergence surfaced, **never broken by fiat and never crowned
by priority alone** (fail-safe applies to *who*, exactly as it does to tier). This is implemented as
`resolveContention` in `@madeby/core` (evidence-frontier / Pareto dominance).

> **Squatting-resistance falls out of this.** Because priority is the *floor* of the stack, not the
> top, a squatter (asserted, no lineage) is outranked the instant the real owner asserts verified
> identity + lineage + ownership — even arriving late. Unlike domains/handles/trademarks, **you
> cannot hold hostage content you didn't make or own**; an asserted claim grants no exclusivity and
> locks nothing.

### No home, no claim — claiming requires a controllable home (decision, 2026-08-11)

The hardest contested case is a **context-free bare artifact** (a mystery binary, a pasted snippet, a
naked hash): no forge, no registry, no lineage — authorship of raw bytes is *fundamentally
unknowable*, and offering to "claim" it is pure attack surface (squatting) for zero real benefit. So
we **scope it out**: a provenance **claim** may only attach to an artifact with a **controllable
distribution home** — a repo (forge), a package (registry), a build output (a `DERIVED_FROM` edge to
controllable source — SLSA/in-toto), a model hub, or a domain the claimant controls. **Every claim
therefore rides an existing control authority; homeless bytes get no claim, ever.** This makes the
bare-artifact edge case and the squatter attack *disappear by construction* — there is nothing to
squat and nothing unverifiable to adjudicate — and it is just the two-hash invariant (§2, the subject
*references* native content) made honest: native content lives *somewhere*.

**Claiming requires a home; asking never does — keep the read side open.** This restricts the *write*
side (claim/register), not the *read* side. A consumer may still **query by hash** (or a blinded
fingerprint, §5/#70, for private lookups); a homeless artifact simply resolves to **"unknown / no
record"** — the honest answer. The consumer investigation and its demand-pull are unaffected (they
target artifacts with a maker who *has* a home anyway).

**What this drops** is only *notarizing homeless bytes* — a niche "I possessed these bytes at time T"
use that was both low-value and the exact attack surface; if ever wanted it is an explicitly
`asserted` timestamp, never verified authorship. The **priority / copyright-evidence** value (§2)
stays intact, because it is for *homed* artifacts (your repo/package, timestamped) — which we keep.

### Claiming a page: proven-control gates authority (decision, 2026-08-11)

You can't stop anyone from *asserting* (assertion is the honor-system floor). What must hold is that
a claim confers **authority — the `verified` mark, narrative control of the page, the right to attest
on its behalf — only when control of the subject is *proven*.** An unprovable claim caps at
`asserted` and is inert; **there is no path to the verified page without proving control** (invariant
#3/#5, fail-safe). So "prevent non-maintainers from claiming" reduces to "never grant authority
without proof of control."

**Control is proven by riding the home's existing authority (BYO, agnostic across homes):**
- **Forge-hosted repo:** OAuth to the forge + verify admin/write via its API (GitHub/GitLab/Gitea is
  the authority on who controls the repo — the Vercel/Netlify pattern), **or** the self-proving
  alternative: commit a signed `.madeby` / challenge token to the repo (only a controller can write
  to it — the Search-Console / DNS-TXT pattern, and the same act as the gate/`prove`).
- **Published package:** the registry's publisher identity (npm/PyPI "who can publish this").
- **Build artifact:** the `DERIVED_FROM` edge back to controllable source (SLSA/in-toto) — reduces
  to the forge/registry case.
- **Domain-homed artifact / model hub:** domain-verification / hub publisher identity.

**Page-control ≠ authorship credit (the separation that stops credit theft).** Claiming the page
controls the *narrative/record* — legitimately the maintainer's right. But the **per-contribution
authorship attestations are signed by each contributor and non-repudiable** — a page-claimer
**cannot overwrite them** to steal a contributor's credit. Page-control and authorship are different
layers; the maintainer controls the page, not who-wrote-what. Contested control resolves through the
contention engine above (`resolveContention`), which crowns no one in a genuine tie.

**The challenge / counter-claim model (specced now, built later).** A challenge is **not an appeal to
a judge** — it is just another claim/edge on the same ladder, so it cannot be weaponized: an unbacked
challenge against a `bound` claim is itself only `asserted` and renders as visibly weak; we never
paint a generic "disputed!" stigma on strong content. Three shapes, all tiered graph nodes/edges: a
**counter-authorship claim** (same fingerprint), a **contradiction** ("this is not the origin") via a
`DISPUTES` edge, or a **lineage assertion** via `DERIVED_FROM`. Challenges are **identity-backed and
appended to the transparency log** — contesting is neither free nor anonymous, so frivolous
challenges accrue to the challenger's record. The record is **append-only and never final**: new
evidence — including an external **court ruling, entering as a high-tier legal event** — reopens and
updates the ranking.

**Two doors into one record.**
- **The individual / "David" door** — reactive, artifact-level, authorship-centric: marshal evidence
  to outrank. Inherently nuanced; for the motivated creator and genuinely contested edge cases.
- **The enterprise / "Goliath" door** — connect the source **once** (verify org identity, install
  org-wide); thereafter every commit/release is **automatically** signed under the org identity,
  timestamped at push (earliest priority), carrying native lineage — *born dominant*, employees do
  nothing. The org's object is an **ownership claim on the legal axis**. Enforcement is alert-driven
  + one-click.

> **No identity-based precedence.** A verified/enterprise identity **never wins by status alone** —
> dominance always rests on evidence; we only make leaving the legitimate trail effortless
> (automation at the source), never grant a privileged override. This is what stops a lying Goliath
> from crushing a truthful David.

**Reactive enterprises & "money buys speed, not outcome."** Most enterprises arrive *after*
discovering a squatter. The common case resolves automatically (priority is the floor). For a
genuinely-contested item, resources buy **operational speed** along the legitimate path — expedited
identity verification (KYB), automated evidence-dossier assembly, guided sworn-ownership filing,
court-ready export — plus a fast on-ramp to external/legal resolution that writes back as a high-tier
event. Money accelerates the *evidence-and-legal path*; it never overrides the ranking. A claimant
who pays but lacks the facts still loses (a false sworn claim is perjury; absent lineage stays absent).

**Residual risk, stated plainly.** The mirror of David-beats-Goliath is a powerful actor filing a
*false* sworn ownership claim against a small creator. We don't eliminate courtroom power asymmetry,
but we don't amplify it: a false sworn claim is **legally actionable** and permanent in the record;
it **does not delete** the creator's claim (which stays visible at its true tier, lineage intact);
and the evidence export is **symmetric** (the smaller party pulls the same dossier). We make the
facts legible to whoever holds them; we don't hand the bigger wallet a bigger thumb.

**Hard limits.** No identity override; no deletion/suppression of competing claims (rank + label,
never censor); priority ≠ proof; we **don't adjudicate ownership/copyright** — we hand courts
*ordered evidence*.

**Consent, abuse & takedown are launch blockers, not "orthogonal policy" (revised — review
2026-06-29, Findings 3 + missing-abuse-model).** An earlier draft punted these as orthogonal; for a
product that publishes inferences about non-consenting third parties and lets *anyone assert
anything*, that was the wrong call. Required before the public path ships: (a) **consent-gated
public name-attached pages** + aggregate-only index + salted/HMAC private fingerprints + self-serve
opt-out/takedown (§8); (b) a **social/economic abuse model** the crypto red-team doesn't cover —
**identity-cost on asserted claims** (GitHub OAuth to assert, raising mass-squatting cost),
**bounded "adjudication by display"** (collapse low-tier/duplicate claims behind an "N other
asserted claims" expander so a contested page never renders unboundedly), and
**corpus-poisoning detection** (one actor claiming many unrelated repos → flag), wired to the
trust-&-safety dashboard and sharing one mechanism with API metering. Court-order takedowns remain
operational, but consent/opt-out/abuse are **product**, designed now.

---

## 12. The open extension model — symmetric plugins + an agent-native client (decision, 2026-08-11)

The architecture is already registry-native (carriers §3, anchors §3, edge types §6, plus open
fields for algorithms/models/providers §10). This section makes that posture a **first-class,
symmetric plugin model**, names its safety envelope, and commits to an **agent-first client** —
because the primary operator of MadeBy is increasingly an AI, not a human.

### Symmetry: our built-ins are just the reference plugins

> **Rule: every capability MadeBy ships as a built-in must be expressible — through the identical,
> published contract — by a third party.** No privileged built-ins, no private hooks.

Our GitHub adapter, our in-toto carrier, our TSA anchor are *reference implementations registered
through the same door* anyone else uses. Today the registries are open in *shape* but compiled-in in
*practice* (`CARRIER_REGISTRY`, `DISCLOSURE_KINDS`, `AI_TOOL_CONFIGS`, `KNOWN_BOTS` are structures in
our packages); the commitment is a **runtime contract + discovery** so a plugin ships and loads
independently of our release cadence.

### The extension-point taxonomy (the plugin kinds)

Each is a typed contract; our built-in is the reference impl:

- **Host adapter** — `{compute the CI range, resolve identity, enrich profile}` for a forge (GitHub
  first; Azure DevOps, GitLab, Bitbucket, Gitea, bare-git next). **The git substrate is universal;
  nothing host-specific may enter `core` — the host is an adapter surface, never a spine assumption.**
  (This is the host-agnostic boundary that triggered this section: git-native core, host-adapted.)
- **Carrier** — parse/serialize/canonicalize a claim binding (§3).
- **Anchor backend** — produce/verify a non-repudiation proof (§3).
- **Disclosure recognizer** — commit/tree → `DisclosureKind` evidence (the DCO / SPDX / trailer /
  tool-config family).
- **Identity provider** — commit identity → linkable handle/profile (GitHub noreply, Sigstore, SSO).
- **Fingerprint algorithm** — content → `{algorithm, target, value}` (§2, open field).
- **Lens / view** — DAG → a computed view (the "many lenses", §6): a renderer, an org report, an
  index cut.
- **Edge inferrer** — subjects → a **tiered** `ClaimEdge` (§6). The highest-risk kind — see the cage.

### The safety cage — why open extension can't forge trust

Open third-party extension is safe **only because the core, not the plugin, enforces the invariants
(§10).** A plugin emits *evidence with an `asserted` ceiling*; the core decides the tier.

- **No plugin can escalate tier.** Invariant #3 generalized: unrecognized/unverified plugin output
  caps at `asserted`; reaching `verified`/`bound` requires canonicalization/verification the *core*
  performs. A hostile carrier cannot mint a `bound` claim.
- **Declarative-open vs. executable-scoped.** A plugin that is pure *data* (markers, regexes, URL
  shapes, id maps) is open to everyone — it can only *describe*. A plugin that *executes* (a parser,
  a canonicalization, a proof verifier) is arbitrary code: it runs capability-scoped/sandboxed, and
  until vetted it **caps the tier** (§3 already forbids executing an unknown canonicalization).
  Prefer declarative; gate executable.
- **The cardinal sins are hard contract limits, not plugin goodwill.** No plugin may infer AI from
  *style* (disclosure, never detection — a recognizer surfaces *declared* evidence only), emit a
  per-person surveillance/productivity score (§6 guardrail), or host person-PII on our surface
  (point-don't-host, §1/§11). Validated at the contract boundary.
- **Identifier governance** (media-type-registry style, §3) covers every kind: who may claim an
  adapter / carrier / anchor / edge id.

### Agent-native: the primary operator is an AI

MadeBy should be operable end-to-end **by an AI agent with no human in the loop** — the same agents
writing today's code are the ones that should disclose it and can adopt the tooling at machine speed.

- **A first-class MCP server** is the agent client: tools with published schemas, self-describing
  capability discovery, structured JSON I/O, agent-held token auth, idempotent ops, and *actionable
  structured errors* (never a human-only stack trace). The CLI already gives agents a scriptable
  surface (stable exit codes); MCP is the same core, made discoverable + typed. **Shipped** as
  `madeby mcp` (stdio, dependency-free) — today `recognize`, `check`, `list_host_adapters`,
  `resolve_identity`; `attest`, `grant`, `explain-tier`, `scaffold-adapter` land as those primitives do.
- **Zero-choice by default** (§3 default profile) *is* the agent-native ethos applied to config:
  "offer every choice, default to none" means an agent operates without a single human decision.
  Every operation must keep a no-human-intervention path (auth, adapter selection, plugin publish).
- **Agent-authored plugins close the loop.** Because a plugin is a declarative manifest + typed
  functions against a *published contract with conformance vectors*, an agent can scaffold, validate,
  and publish a new adapter against the same vectors we hold our built-ins to. `scaffold-adapter`
  emits the skeleton; the conformance harness is the gate. Symmetry × agent-native compounding.

### The strategic reading (this is the moat, not a giveaway)

We own the **standard + registry + default gravity + identity / resolver / legal** — never the
adapters (exactly the carrier posture: "an adopted open spec is a moat; a proprietary one is a
liability", §3). An open, symmetric, agent-authorable ecosystem grows coverage faster than we could
build it, and still concentrates the derived data at the hosted resolution/grant layer (the moat,
`STRATEGY.md §6`) regardless of who wrote the adapter.

### Primitives you run, not code you ship (decision, 2026-08-11)

We resolve the plugin-loading question by **inverting it**. Rather than a runtime that loads
third-party code — with the sandbox, distribution, and conformance burden that implies — MadeBy
exposes its trust operations as **composable primitives** that a third party runs **in their own
environment**:

- a **stable library** — `@madeby/core` (recognizers/evaluators: `commitDisclosureKinds`,
  `evaluateDisclosurePolicy`), `@madeby/analyzer` (git read, identity, the host-adapter registry);
- **CLI primitives with structured I/O** — `madeby recognize --json` (the raw recognizer, no policy)
  and `madeby check --json` (the gate's result), composable from any language or agent.

Supporting a new host, gate, or view is **composing our primitives on their compute** — never
registering a bundle with us. A new CI host needs *no adapter from us*: compute the range however
that host exposes it and pass `madeby check <range>` (GitLab: `npx madeby check
"$CI_MERGE_REQUEST_DIFF_BASE_SHA..$CI_COMMIT_SHA"`). The built-in HostAdapter registry (above) stays —
for the hosts we make turnkey — but it's a convenience, **not** the extension path.

Why this is the right inversion:

- **No sandbox** — their code runs on their infra, not ours; we execute nothing untrusted.
- **No plugin distribution / registry-of-code** — they ship and run it themselves.
- **The trust boundary is the primitive.** Whatever they compose can only produce what the primitives
  permit (invariant-capped, §10), so open composition still can't forge trust. Conformance collapses
  to "does your output validate against our published primitive schemas," which they self-check.

This retires the parked open questions (executable-plugin sandbox, code distribution, conformance
vectors) for the common case. The one thing that still merits a hosted, loaded surface is where the
work *must* run on our data (the corpus index, the resolver) — a narrow, first-party set, not the
open extension path.

---

## What we explicitly dropped from v1

- The hardcoded `AIModel` / `AIProvider` enums (→ open fields / small registry).
- The PNG-with-QR badge as the centerpiece (→ live-served markdown shield + linked resolver).
- Producer-push / form-first as the spine (→ asker-pull + analyze-existing-history wedge).
- Speculative empty tables (provider credentials, unused provenance/attestation scaffolding)
  — re-introduce only when a real flow needs them.
- The unverified-content-hash-as-decoration pattern (→ hash is the load-bearing join key,
  with honest tiers).
