# Regulatory check — does the EU AI Act or ISO 42001 require code-authorship attestation?

*2026-08-13. Analytical work under `PRE-INCORPORATION.md §7.1`. Not legal advice — this is a reading
of statutory text plus secondary sources; counsel must confirm before it is load-bearing. Timing:
AI Act Art. 50 and the high-risk regime took effect 2026-08-02.*

## The claim tested

`STRATEGY.md` rests the primary (governance) monetization line on a regulatory forcing function:

- §4 "Regulatory tailwind": *"The EU AI Act and similar disclosure rules convert 'nice-to-have
  provenance' into 'must demonstrate provenance.'"*
- §6: *"continuous compliance evidence (always-current attestation for EU AI Act / ISO 42001 — the
  strongest forcing function)"*; *"two of the three [forcing functions] are strengthening through
  2026, which makes the continuous case bet-able."*

Read strictly, this asserts that the AI Act / ISO 42001 create a duty to attest **code-authorship
provenance** — who (human) or what (AI) wrote which lines of a codebase — making a governance product
a compliance *must*.

## Verdict: category error

Neither instrument requires an organization to attest which lines of its source code an AI wrote.
Confirmed against the statutory text and, for a fair test, against a vendor guide that *sells*
provenance tooling — which still claims no such mandate.

## What the statute actually binds

- **Who it regulates (Art. 2–3).** *Providers* and *deployers* of AI **systems** — the AI system as a
  product/service. Using an AI coding assistant to write ordinary software makes you neither. No
  provision is keyed to who authored source code.
- **Art. 50 (transparency).** Marks AI-generated **content/outputs** (synthetic media, deepfakes,
  chatbot text) as machine-readable "artificially generated." An obligation on the AI
  provider/deployer about *outputs* — content watermarking for detection — not a code-authorship
  ledger.
- **High-risk documentation (Art. 11 / Annex IV) + GPAI (Art. 53 / Annex XI).** The "provenance"
  required is **training-data** provenance, on the model/system provider. No human-authorship
  documentation, no code-line attestation.
- **ISO/IEC 42001.** An AI *Management System* standard. Traceability = data/model lineage + audit
  logs for the AIMS. Not human-vs-AI code authorship.

## The honest kernel (do not over-swing)

- **Art. 50 is real — but a different buyer.** AI *labs* must mark their generative outputs. Supports
  §4's "labs as channel/customer," not the intra-org governance buyer §6 targets.
- **IP / copyright liability of AI-generated code is real and strengthening** (the Copilot suits;
  ownership uncertainty). But it is **voluntary risk management, not a mandate** — a weaker, different
  pitch (defensive IP hygiene, not "compliance attestation").
- **Supply-chain / SBOM (CRA, SSDF) is real** but about vulnerabilities and components, not
  human-vs-AI authorship.

## Consequence

- The *regulation* leg of `STRATEGY §6`'s "two of three forcing functions" does **not** support the
  code-authorship governance line. Stamped `[HYPOTHESIS — FALSIFIED]` in §4 and §6.
- The governance line survives only if repositioned onto IP-liability / supply-chain — weaker
  drivers, different urgency, and (for Art. 50) a different buyer. **That repositioning is a
  first-contact decision, frozen per `PRE-INCORPORATION §6`.** Not decided here.
- Value: this saves the year that would otherwise fund a compliance product for a mandate that does
  not exist — the negative result §7.1 predicted would be worth more than a positive one.

## Sources

- EU AI Act — [Article 50](https://artificialintelligenceact.eu/article/50/) ·
  [Article 3](https://artificialintelligenceact.eu/article/3/) ·
  [Annex IV](https://artificialintelligenceact.eu/annex/4/) ·
  [Article 53 (GPAI)](https://www.legalithm.com/en/ai-act-guide/article-53)
- [Code of Practice on Transparency of AI-generated Content (2026), European Commission](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)
- [ISO/IEC 42001 overview (Microsoft Learn)](https://learn.microsoft.com/en-us/compliance/regulatory/offering-iso-42001)
- [Augment Code — "The 2026 EU AI Act and AI-Generated Code" (steelman)](https://www.augmentcode.com/guides/eu-ai-act-2026)
- [Who Owns AI-Generated Code? (IP/liability driver)](https://www.aimadetools.com/blog/who-owns-ai-generated-code/)
