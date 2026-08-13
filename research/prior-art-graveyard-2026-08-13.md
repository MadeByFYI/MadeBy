# The prior-art graveyard — who tried code provenance, and how it died

*2026-08-13. Analytical work under `PRE-INCORPORATION.md §7.3`: discipline the moat story; the
cheapest source of disconfirmation. Secondary sources — not legal or academic peer review.*

The point is not to list competitors. It is to ask: **of everyone who tried to answer "who made this
code," what killed them — and does MadeBy repeat the mistake or avoid it?** The answer, encouragingly,
is that the three biggest graveyards are the exact three things our doctrine already refuses, and the
one incumbent who tried it fumbled in a way our posture is built to avoid.

## Graveyard 1 — AI-code *detection* (we refuse it; the field proves us right)

The instinctive product ("detect AI-written code") is a proven dead end.

- Accuracy is **60–90%** on code (worse than text), collapses on short snippets, and is **defeated by
  paraphrasing** — DetectGPT fell from 70.3% to 4.6% on paraphrased output.
- **False positives on clean human code** — idiomatic, well-structured senior-engineer code reads as
  AI to a perplexity detector.
- **40+ universities restricted or discontinued detectors** over wrongful-accusation risk.

This is the graveyard `MISSION` value 1 (disclosure, not detection) was written to avoid. We do not
compete here; we refuse to be here. The field's failure is our validation.

## Graveyard 2 — code *stylometry* / authorship de-anonymization (we refuse it too)

The academic line — attribute code to a person by coding style (Caliskan et al., USENIX 2015; 94–98%
on Google Code Jam) — never became trust infrastructure, for two reasons that are our doctrine:

- **Accuracy "drastically drops on realistic data"** — the lab number is a mirage; there is no
  verified labeled corpus at scale (the same corpus problem our `GROUND-TRUTH.md` names).
- **It is a surveillance weapon.** It de-anonymizes contributors who had reason to stay anonymous
  (censorship-circumvention authors, activists under repressive regimes). "Adversarial stylometry"
  exists specifically to defeat it.

`MISSION` value 5 (the person is never the target) + point-don't-host is the refusal of this graveyard.
We read what a maker *discloses*; we never fingerprint their style to unmask them.

## Graveyard 3 — provenance embedded *in the file* gets stripped (C2PA's hard lesson)

C2PA / Content Credentials (media provenance) is the closest structural precedent, and its dominant
failure mode is instructive: **embedded provenance metadata is stripped** at nearly every distribution
hop — social platforms recompress and drop manifests, screenshots erase them — so "the content
reaching the widest audience is almost certainly devoid of any provenance trace." C2PA's fix, now
being retrofitted, is **Durable Content Credentials**: a perceptual **fingerprint + watermark** so the
claim survives when the metadata doesn't — "an active area of work, not a guarantee."

**MadeBy has this as its spine, not a retrofit.** The asker-pull design keys on the *content's own
fingerprint* and resolves by hash (`ARCHITECTURE §1–2`, the two-hash invariant): anyone holding the
bytes can ask "who made this," even after the `.madeby` sidecar or the trailer is stripped by vendoring
or copy-paste. The exact durability C2PA is scrambling to add, we started with.

## The incumbent fumble — GitHub/Microsoft already tried, and retracted (2026)

The most important competitive fact, and it maps straight onto the `PRE-INCORPORATION §4/§10` category
clock ("if GitHub ships native AI-authorship metadata, the wedge narrows"):

- **April 16, 2026** — VS Code's Git integration began appending a **Copilot `Co-Authored-By:` trailer
  by default** (`git.addAICoAuthor = all`).
- **May 3, 2026** — reversed to off after backlash.
- The backlash reasons are the lesson: **opt-out AI creep, authorship ambiguity, and vendor
  self-promotion.** It read as Microsoft promoting Copilot in everyone's commit history, not as neutral
  disclosure.

So the trigger **partially fired and failed.** Read carefully:

- The space is real enough that the incumbent moved — *validation*.
- A **vendor, default-on, self-promoting** tag is toxic. MadeBy's posture is the corrective it can't
  copy: **opt-in, neutral, maintainer-owned, a standard rather than one company's trailer.** GitHub
  structurally *can't* be the neutral steward of "who made this" — it is one of the makers.
- The neutral-standard position is therefore still **open** — but contested, and the clock is real.
  The live risk isn't that GitHub tried; it's that GitHub tries **again, better** (opt-in, neutral).
  Track it (`§10`).

## Living-but-adjacent (the moat map, not the graveyard)

- **Tabnine, Apiiro — AI-code "provenance & attribution."** Real and shipping, but they do source
  *matching* (does this AI output resemble known/training code → **IP/copyright/license** risk), not a
  disclosure ledger of *who/what made it*. Different question, different buyer. Overlaps the IP-liability
  driver the regulatory note flagged as the *real* one.
- **SLSA / in-toto / SBOM.** The living provenance standards — but they cover the **build/delivery
  chain and components**, and (their own framing) "do not solve source-level attribution for
  AI-written code." The gap MadeBy fills is real and *unfilled by the incumbughts' standards*.

## The de-facto signals are already ours

A 180M-repo census of AI coding agents (arXiv 2606.24429) attributes via exactly our recognizer's
signals: **bot logins** (`copilot-swe-agent[bot]`), **vendor emails** (`noreply@anthropic.com`),
**agent names** (`Cursor Agent`), and **`Co-Authored-By:` trailers.** And the honest gap it names —
"most developers acknowledge AI in some way, yet few explicitly credit it with writing code" — is the
disclosure gap we exist to close. We aren't inventing the convention; we're standardizing and
enforcing the one already forming.

## Moat discipline — what actually survives

The graveyard says the moat is **not** the tech and **not** the format:

- Detection tech is a graveyard; stylometry is a graveyard; both are refused, not owned.
- The *format* alone is commoditizable and the incumbent tried to absorb it.

What is left standing — and matches `STRATEGY §12`'s own claim — is the **neutral standard + the
content-anchored resolver + the posture no incumbent can occupy**: opt-in, maintainer-owned,
disclosure-not-detection, person-never-the-target, and a resolver keyed on content that survives
stripping. GitHub can ship a trailer; it cannot be neutral. A detector can accuse; it cannot be
trusted. That un-occupiable middle is the defensible ground — and the block is being spent building
exactly the invariant parts of it (format, recognizer, verifier, corpus).

**One disconfirmation to hold honestly:** the moat is a *position*, not a technology — which means it
is defended by adoption and neutrality, not by anything patentable. That is consistent with the
strategy ("the moat is trust, not lock-in") but it means the category clock (`§4`) is the real risk,
not any competitor's tech.

## Sources

- AI-code detection limits — [arXiv 2306.15666](https://arxiv.org/pdf/2306.15666) · [USD Legal Research Center on false positives](https://lawlibguides.sandiego.edu/c.php?g=1443311&p=10721367) · [overchat.ai — are AI code detectors accurate](https://overchat.ai/ai-hub/are-ai-code-detectors-accurate)
- Code stylometry / de-anonymization — [Caliskan et al., USENIX Security 2015](https://www.usenix.org/system/files/conference/usenixsecurity15/sec15-paper-caliskan-islam.pdf) · [Code stylometry (Wikipedia)](https://en.wikipedia.org/wiki/Code_stylometry) · [Code Authorship Attribution: Methods and Challenges (ACM)](https://dl.acm.org/doi/10.1145/3292577)
- C2PA stripping + durable credentials — [truescreen.io on C2PA limits](https://truescreen.io/articles/c2pa-standard-history-limitations/) · [World Privacy Forum on C2PA](https://worldprivacyforum.org/posts/privacy-identity-and-trust-in-c2pa/)
- GitHub/VS Code Copilot co-author trailer — [Aitoolsbee](https://aitoolsbee.com/news/copilot-attribution-sparks-vs-code-rollback-on-default-co-author-tag/) · WindowsForum thread (blocked to automated fetch; corroborated by Aitoolsbee)
- Adjacent provenance — [JFrog: software provenance](https://jfrog.com/learn/grc/software-provenance/) · [Apiiro: code provenance](https://apiiro.com/glossary/code-provenance/) · [Tabnine: provenance & attribution](https://www.tabnine.com/blog/from-suggestion-to-source-why-provenance-and-attribution-belong-in-your-ci-cd-pipeline/)
- De-facto signals — [Detecting AI Coding Agents in Open Source (arXiv 2606.24429)](https://arxiv.org/pdf/2606.24429)
