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
  Private subjects use scoped or salted/HMAC fingerprints and permissioned resolution, so
  the registry can confirm provenance to authorized askers without making private code
  world-queryable. In the model from the start, not bolted on.

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

---

## 8. Cold-start: continuous public-git ingestion, and the index

The world's public git history is already a **content-keyed, authorship-annotated dataset**
(every public commit has an author, timestamp, content-addressed snapshot). A **continuous
ingestion pipeline** mines it, producing both per-subject claims and aggregate indices.

- **Auto-populate the asserted tier** by ingesting public repos → the resolver returns
  *something* (unverified, "git blame + heuristics say X") from day one, before anyone opts in.
- **Verified / sworn / bound tiers are opt-in upgrades** layered onto entries that already
  exist. The flywheel starts from all of open source, not from zero.
- Substrate for the **"analyze your existing git history" wedge** and the public **resolver
  pages** that drive SEO (see `STRATEGY.md` §4).
- The vibe-coding angle clicks in here: the AI tool's session log **upgrades** an asserted
  git-blame claim to evidence-backed span attribution, keyed on the same hashes.

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
- **Mix-led default content** (human/AI ratio headline + tier mark); tier gradient lives in
  the **trust mark**, not aesthetic quality; honest qualifier ("estimated") doubles as the
  upgrade pull. See `STRATEGY.md` §5 for the full treatment.

---

## 10. Proposed entity model (first sketch, not final)

Deliberately small — resist v1's speculative breadth. Open string/registry fields over rigid
enums where values churn (models, providers, carriers, algorithms).

- **Subject** — a piece of content. Has many **Fingerprints** `{algorithm, target, value}`
  (multi-resolution). The resolver's lookup key.
- **Identity** — individual / org / AI. Has verified **Anchors** (email, domain, phone,
  address, **public key / wallet**). AI identities have provider/model/version + **operator**
  (→ Identity).
- **Claim** — *the core object.* References a Subject (by Fingerprint, never re-hashed),
  asserts an **Attribution** (Identity + role; for AI, model + operator), carries a **tier**,
  a **canonical payload**, and a **Signature**. Is itself content-addressed (claim hash) so
  Claims can reference Claims.
- **ClaimEdge** — typed link between claims/subjects: `PART_OF` (composition) or
  `DERIVED_FROM` (derivation).
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

---

## What we explicitly dropped from v1

- The hardcoded `AIModel` / `AIProvider` enums (→ open fields / small registry).
- The PNG-with-QR badge as the centerpiece (→ live-served markdown shield + linked resolver).
- Producer-push / form-first as the spine (→ asker-pull + analyze-existing-history wedge).
- Speculative empty tables (provider credentials, unused provenance/attestation scaffolding)
  — re-introduce only when a real flow needs them.
- The unverified-content-hash-as-decoration pattern (→ hash is the load-bearing join key,
  with honest tiers).
