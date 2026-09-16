# ACO — the Authorship Certificate of Origin

**Status:** v0.1 draft · open standard · comments welcome (open an issue)
**Reference implementation & canonical verifier:** [MadeBy](https://github.com/MadeByFYI/MadeBy)

ACO is an open, tool-independent standard for **verifiable authorship disclosure** of code and other
content — a signed, content-bound, tiered statement of *which of {human, with_ai, ai}* authored a unit of
work. It is the authorship-era companion to the [Developer Certificate of Origin
(DCO)](https://en.wikipedia.org/wiki/Developer_Certificate_of_Origin): where the DCO attests you have the
*right* to contribute, ACO attests *who — and what — authored* the contribution, in a form a machine can
verify.

The standard is deliberately separate from any one tool. MadeBy is its reference implementation and
canonical verifier, but ACO is a spec anyone may implement, and its claims are verifiable by anyone —
that independence is the point.

## 1. What ACO certifies — and what it does not

ACO certifies a **claim, not a fact.** For a specific unit of content it records *which category the
signer states authored it*, bound to that exact content, attributable to an identified signer, tamper-
evident, and carrying a **tier** that says how well-corroborated the statement is.

- It certifies *that a disclosure was made, by whom, over exactly this content, and how much stands
  behind it.*
- It does **not** claim the statement is metaphysically true, and it does **not** detect authorship by
  inspecting source. Undisclosed content stays **unknown** — never a guess.

Truth is approached *asymptotically through the tiers* (§4): corroborating evidence can raise a claim
from *asserted* toward *bound*, but the standard never manufactures certainty, and it **fails safe** —
an implementation degrades to *asserted* or *unknown*, never to falsely-verified.

This is the DCO move: certify a signed, attributable *statement* the ecosystem can converge on, rather
than fight an unwinnable authorship-detection arms race.

## 2. The taxonomy

Authorship is disclosed as one of three categories (the "three-way taxonomy"):

| Category   | Meaning                                              | Badge     |
|------------|------------------------------------------------------|-----------|
| `human`    | Authored by a human, no AI involvement disclosed     | `human`   |
| `with_ai`  | Human-authored with disclosed AI assistance          | `hi + ai` |
| `ai`       | Authored by an AI agent (with human accountability)  | `ai`      |

The category is a property of the **disclosure**, not an inference. `with_ai` is a first-class middle
state, not an afterthought: a human is accountable **and** the AI is disclosed.

## 3. The claim (semantic core, carrier-independent)

Every ACO claim, in any carrier (§5), carries the same semantic core:

- **Subject** — *what* content, anchored by a **reference to a native content hash**
  (`{alg, target, value}`) at one or more resolutions (exact: git blob/tree/commit SHA, `sha256`;
  structural: AST-normalized / fuzzy fingerprints). The subject is a *reference* to a native hash, never
  a re-hash of content into an ACO-specific envelope (see §6, invariant 1).
- **Attribution** — the **category** (§2) plus, for AI, the **provider / model / version as open fields**
  (never a closed enum), plus the **operator**: the human or org whose key stands behind the claim.
- **Evidence + tier** — the corroboration level (§4) and its source (self-report, tool session log,
  signed commit, Sigstore, C2PA, sworn declaration).
- **Signature** — the operator key and timestamp, computed over the **canonical form of the claim**
  (§6, invariant 2) — independent of carrier.
- **Optional overlays** — a sworn legal/rights assertion; lineage (`derived-from`).

## 4. Trust tiers

A claim resolves to exactly one tier, and **no claim is elevated beyond what its carrier and signature
support**:

- **asserted** — a self-report (e.g. a commit trailer). The floor. Always available; requires no keys.
- **verified** — backed by corroborating evidence whose canonicalization is known (e.g. witnessed
  tool-session spans, structural match), signature-checkable.
- **sworn** — carries a legal/rights declaration overlay by an accountable party.
- **bound** — cryptographic hard binding: the claim incorporates an existing *signed* content hash
  (signed git commit, C2PA hard binding, Sigstore), so signer and content are cryptographically joined.

**Degradation rule:** a recognized carrier with known canonicalization can reach its full tier; a
self-describing carrier is readable and, if its canonicalization is declared, verifiable; a fully
unrecognized carrier is parsed and displayed but **capped at *asserted*** with a "binding not
recognized" flag. An unknown implementation degrades gracefully; it never breaks verification.

## 5. Carriers (bindings) — subsume, don't compete

ACO separates *what a claim says* (the semantic core, §3) from *how it is serialized* (the carrier). The
signature is over the canonical claim, so the same claim in two carriers verifies identically.

A **carrier registry** lists recognized bindings, each with a parser and a stable identifier. ACO's
posture toward the disclosure conventions that already exist is to **recognize and verify them, not
replace them** — an existing disclosure is ingested as a carrier at its supported tier:

- **DCO sign-off** (`Signed-off-by:`) — recognized; ACO adds the authorship category and the verifiable
  tiering the DCO alone doesn't express.
- **SPDX 3.0 AI profile / SPDX-AI-Disclosure tags** — recognized (interop / BOM export).
- **Commit trailers** — the canonical asserted-tier carrier (see §7).
- **in-toto predicate** — signing-native; composes with the Sigstore / SLSA rails.
- **git-notes**, **commit signatures**, and **witnessed AI-span evidence** (`.madeby/spans`).
- **Self-hosted sworn declarations** — detected and pointed to, never re-hosted.

Unknown carriers are handled by self-description + tier-capped degradation (§4). The format is open and
governed lightly (media-type-registry style: who may claim a binding identifier).

## 6. Invariants (any conformant implementation must hold these)

1. **The subject of a claim is a *reference* to a native content hash, never a re-hash of content into
   the standard's own envelope.**
2. **Signatures cover the canonical claim payload, independent of carrier.**
3. **Unrecognized carriers / unverifiable signatures cap at the *asserted* tier.**
4. **"Percent authored" is a computed *view*, never stored ground truth.**
5. **The system fails safe** — degrade to asserted / unknown, never to falsely-verified.
6. **Aggregate indices are labeled estimates** with a surfaced tier distribution.

## 7. Conformance

- **Emit (asserted tier)** — the floor is a commit trailer, and requires no keys or infrastructure:
  - `human`: `Authored-by-human: <name> <email>`
  - `with_ai`: `Authored-by-human: <name> <email>` **and** `Assisted-by: <tool>`
  - `ai`: an `Authored-by-ai: <tool>` trailer (`madeby ai`) — an AI authored it, the committer is the
    accountable human — optionally upgraded with witnessed AI-span evidence (`madeby ai --witness`).
  A producer is ACO-conformant at the asserted tier if it emits a recognized carrier (§5) that expresses
  a §2 category over a §3 subject.
- **Verify** — a verifier is conformant if it resolves claims through the tier and degradation rules of
  §4, honors every invariant in §6, and never elevates a claim beyond its carrier + signature.
- **Higher tiers** (`verified` / `sworn` / `bound`) layer onto the same claim as evidence, signatures,
  and identity anchoring become available — the asserted claim is never invalidated, only corroborated.

**Adopting the convention (repos):** drop an [`AGENTS.md`](./AGENTS.md) disclosure convention into your
repository so any agent working there discloses at the asserted tier with no setup (`npx madeby …`). This
repository's [`AGENTS.md`](./AGENTS.md) is the reference convention.

## 8. Relationship to neighboring standards

ACO **rides** where a standard exists and **extends into the gap** where none does:

| Neighbor | Relationship |
|----------|--------------|
| **DCO** | ACO is the authorship-era companion; ACO recognizes and verifies DCO sign-offs as a carrier. |
| **SPDX 3.0 AI profile** | Recognized carrier for interop / BOM export. |
| **Sigstore / SLSA / in-toto / npm provenance** | Identity + signing rails ACO rides for the `bound` tier; ACO adds the human/AI authorship semantics they don't carry. |
| **C2PA / Content Credentials** | The media-provenance analog; ACO focuses on code and text authorship. |

Identity in ACO **anchors existing roots** (OIDC / keyless / domain control, Sigstore-shaped) rather than
minting a new PKI.

## 9. Governance & status

ACO is an **open standard**. This is a **v0.1 draft** and will version explicitly. The standard is
carrier-open and lightly governed; the reference implementation and canonical verifier is MadeBy, and
the standard is federatable — anyone may implement, verify, or self-host, and that exit is real by
design. Public feedback (issues / PRs) is welcome and expected to shape v1.
