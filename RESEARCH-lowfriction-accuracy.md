# Research Study — Improving Low-Friction Detection Accuracy Without Over-Claiming

**Can the low-friction path detect untrailered AI code without violating the fail-safe doctrine?**

> **Status:** research synthesis, dated 2026-07-01. **Companion to** `GROUND-TRUTH.md` (the 0%
> untrailered-recall headline this study interrogates) and `TESTING.md §2` (the fail-safe /
> severity-inversion doctrine under test). **Owner:** trust-QA / classification. **Decision it
> informs:** whether to build a probabilistic detection tier on the low-friction path, and if so,
> under what constraints.

---

## 0. Executive summary

One root objection frames this study: **the accurate path (`capture --local`) is high-friction, the
low-friction path (the web "curiosity mirror") is inaccurate, and the gap between them sits exactly
where the heaviest AI users arrive.** The low-friction detector is trailer-only and its measured
recall on untrailered AI is **0%** — worst for exactly those heaviest AI users.

This study pressure-tested the doctrine that produced that 0%: *"never over-claim AI about a human"*
(prefer false negatives; refuse behavioral/probabilistic heuristics). The requester authorized the
study to challenge that doctrine, not merely work within it, and fixed "low-friction" at **git
history + a one-click GitHub OAuth — no local install, no behavior change.**

**Finding, in one sentence:** the empirical literature does **not** support relaxing the doctrine
into a detector that publishes a human/AI *number* on the low-friction path — no reviewed method
holds a ≤1–2% false-positive rate on genuine human code at useful recall in MadeBy's operating
regime (zero-shot, mixed languages, short/inline fragments) — **but** the objection can still be
answered by changing what a detection signal is *for*: **routing, not attribution.** A signal used
to *abstain-or-flag and redirect to `capture --local`* makes no attribution claim, so it never
violates the doctrine, and it lands the upgrade CTA at first contact.

**Three load-bearing conclusions:**
1. **Keep the fail-safe doctrine for the headline number.** Nothing in the evidence clears the
   honesty bar as a published attribution.
2. **The reframe is the unlock:** detection-as-routing (catch + redirect the blind-spot user)
   instead of detection-as-attribution (label them).
3. **The real answer to the objection is not a detector at all** — it is coverage-led framing plus a
   frictionless `capture --local`. The study confirms you cannot honestly close the git-only
   accuracy gap today, so the effort belongs on making the *accurate* path trivial.

---

## 1. The question, precisely stated

- **Central question (doctrine pressure-test):** Is refusing all behavioral/probabilistic inference
  too conservative? What could a *calibrated, honestly-labeled* probabilistic tier add to recall on
  untrailered AI code — **and at what measured false-positive cost on genuinely human code?**
- **The number that decides it:** false-positive rate (human code mislabeled AI) at a *usable
  operating point*, not threshold-free AUROC. This is the number a trust brand lives or dies on, and
  (see §4) the one the literature systematically omits.
- **Friction ceiling:** anything reachable from git history + a consumer GitHub OAuth grant.
  Explicitly *out*: local install, session-log capture, behavior change (those are the high-friction
  accurate path, `capture --local`).
- **Honesty bar (from `TESTING.md §2`):** over-claiming trust is the catastrophic bug class. "No
  signal / asserted / processing" are all safe outputs; a confident wrong attribution is the only
  true failure. Any recommendation must respect this or explicitly argue for changing it.

---

## 2. Method and its limits

- **Fan-out research** across five angles: (1) academic code-detector benchmarks + FP rates;
  (2) git/repo forensics + code-stylometry misfire; (3) GitHub-OAuth platform signals + Copilot
  telemetry; (4) calibration / selective prediction / fixed-FP operating points; (5) prevalence
  grounding + AI-text-detector false-positive harms (cautionary).
- **22 sources fetched** (19 primary/academic + GitHub docs; 3 secondary/vendor), **101 falsifiable
  claims extracted**, **25 highest-stakes claims adversarially verified** by a 3-vote panel where
  2/3 refutes kills a claim. **Result: 22 confirmed, 3 refuted, 0 unresolved.** The 3 refuted claims
  are quarantined in §11 so they are not cited by accident.
- **Every number below is tagged**: **[code]** vs **[prose]**, and **[independent]** vs **[authors'
  own setting]** vs **[vendor/CEO]**. This distinction is not pedantry — the strongest-looking
  numbers are the least transferable.

**Limits of the evidence base (stated plainly):**
- Much of the field is 2024–2026 arXiv preprints in a fast-moving area; a few results are the
  authors' own settings, not independent replications.
- The one "provable FP bound" result (conformal prediction) was demonstrated on **prose only**.
- The git-forensics and agent-fingerprinting studies define "AI code" via commit-message/trailer
  mentions or use *no human class at all* — so they describe the population MadeBy **already
  catches**, not the untrailered blind spot.
- **No source provides a false-positive rate for a low-friction zero-shot detector on arbitrary
  real-world human repositories.** The exact number MadeBy needs is absent (see §4).

---

## 3. The 2×2 this study was adjudicating

The low-friction detector occupies one corner of a false-positive × recall grid. The objection is
that today's corner is fatal for the mirror; the study asked whether a better corner is reachable.

|  | **High recall on untrailered AI** | **Low recall (today)** |
|---|---|---|
| **≈0 false-positives** | *The prize.* **Study verdict: not reachable at low friction / zero-shot.** | ✅ Today's trailer-only detector (0% untrailered recall, 0 human FP) |
| **Some false-positives** | Where real AI-code detectors live — **5–7%+ FP on human code**, or FP simply unmeasured | — |

Every recall gain in the reviewed literature comes with a false-positive cost that is either
(a) unmeasured (AUROC-only reporting), or (b) lands at 5–7%+ on human code, or (c) achieved only
under trained/single-generator/single-language lab conditions that do not transfer.

---

## 4. The systemic reporting gap (the sharpest finding)

> **No reviewed source reports the false-positive rate of a zero-shot code detector at a fixed
> low-FP operating point (e.g. TPR@1%FPR) on arbitrary real-world human repositories.**
> *(confirmed 3-0 — `2412.16525v2`, `DetectCodeGPT`)*

The code-detection field reports **AUROC** almost exclusively. AUROC is threshold-free: it measures
ranking quality across *all* thresholds and says **nothing** about the false-positive cost at the
threshold you'd actually ship. A method can post AUROC 0.83 and still misclassify 20% of human code
at the threshold that gives useful recall — AUROC cannot tell you, and these papers do not say.

**Consequence for MadeBy:** you cannot borrow anyone's validation. The number your decision hinges
on is not merely hard to find — it does not exist in the literature. If you ever ship a probabilistic
tier, **you must first measure your own human-code false-positive baseline.** This is on-brand: you
already publish `GROUND-TRUTH.md`'s honest 0% recall; measuring your own TPR@1%FPR is the same move.

---

## 5. Signal-by-signal inventory

Each subsection: what it is, measured recall AND false-positive (tagged), and the read for MadeBy.

### 5.1 Perplexity / zero-shot code detectors (DetectGPT, DetectCodeGPT, DetectGPT4Code, Binoculars-style)

| Method | Metric | Value | Tag |
|---|---|---|---|
| DetectCodeGPT (best zero-shot) | avg AUROC | **0.8308** (+7.6% vs Log-Rank) | [code][authors' setting] — **no FPR reported** |
| DetectGPT4Code | AUC / recall | **0.70–0.80 / TPR 20–60%** | [code][independent] |
| Plain DetectGPT on code | AUC | **0.50–0.60** (≈ coin-flip) | [code][independent] |
| NL text detectors on code | AUC | **0.40–0.50** ("unsuitable for reliable classification") | [code][independent] |

**Degradation on MadeBy's hardest targets (all [code][independent], 3-0):**
- **Language:** perplexity is effective in C/C++ (~90% AUC) but **unsuitable for high-level
  languages — Python best 63.89% AUC** (Python's simplified stylometry makes LLM output human-like).
- **Length:** **69.75% AUC at ≤20 LOC** vs 87.81% at >50 LOC. Inline-autocomplete fragments are
  short by definition.
- **Diversity/temperature:** AUROC drops **0.9896 (T=0.2) → 0.72–0.79 (T=1.0)**.

**Read:** unusable as a headline signal — the blind spot (short Python/JS autocomplete fragments)
sits squarely in the collapse zones. Only conceivably usable *language-gated* (C/C++) and
*length-gated* (>50 LOC), as a soft prior into an abstaining ensemble — never a standalone claim.

### 5.2 Trained supervised classifiers

- **XGBoost / TF-IDF: 98.28% accuracy, 97.87% precision, 98.70% recall, AUC 99.84%, ~2% implied
  FPR** — *the only reviewed result meeting the ≤2% FP target.* **[code][authors' setting]** (3-0)
- **Why it does not transfer:** trained/supervised · **GPT-3.5-turbo only** · **Python only** ·
  **balanced dataset** · **APPS/CodeContests/MBPP function-length snippets.** Every enabling
  condition is exactly what a zero-shot detector on arbitrary mixed real-world repos lacks. The same
  paper's zero-shot regime — the one closest to MadeBy — is far weaker (§5.1).

**Read:** a mirage. Cited so no one mistakes the 98% for a green light; the conditions are the point.

### 5.3 Code stylometry / authorship attribution

- Structural AI-vs-human differences are **statistically significant but tiny**: Cohen's *d*
  generally **<0.2** (statement count d=0.155; cyclomatic complexity d=0.030). [code][independent]
- **Misfires exactly where MadeBy would apply it:** intra/inter-author JS divergence **0.016**
  (authors converge on identical idioms); **<200 tokens carries no usable signal**; accuracy
  unstable across languages (C++ 64% vs C# 94%). (3-0)
- **Trivially defeated:** GPT-4 semantic-preserving refactors (rename / reorder / strip comments /
  remove dead code) flip authorship predictions **15.72%–56.57%** of the time (path-based baseline
  42.18%). [code][independent] (3-0)

**Read:** cannot underwrite a low-FP AI-vs-human claim. The idiom-convergence failure is the code
analogue of the prose-detector demographic bias in §7 — it misfires on *conventional* code, which is
most code.

### 5.4 Git / repository forensics (the heuristics already refused)

- Even a careful multi-stage pipeline retains **~5–7% human-as-AI false positives** (rule filter
  TN=95/100; LLM classifier TN=93/100) — on a *favorable pre-filtered* pool, not arbitrary repos. (3-0)
- Git-level differences are **real but modest**: AI-associated commits are smaller (churn **24.70 vs
  152.02**), slightly more off-hours (0.372 vs 0.358), less pre-release (0.622 vs 0.694), longer
  handoff latency (**28.28 vs 11.23 days**). [code][independent]
- **Decisive caveat:** "AI-associated" was defined by **commit-message/trailer mentions** — i.e. the
  population MadeBy **already catches** via trailers. These studies do **not** characterize the
  untrailered blind spot at all.

**Read:** confirms the existing refusal of diff-size/cadence heuristics was correct. Modest effect
sizes, 5–7% FP, and they don't even address the gap they'd be recruited to close.

### 5.5 GitHub platform signals via OAuth

- **Copilot Metrics API exposes only aggregated counts** at enterprise / org / team level — **never
  per-repository, per-file, or per-commit provenance** ("reports counts, not provenance"). Access
  needs elevated admin scopes (`read:org`, `manage_billing:copilot`, `read:enterprise`) gated behind
  org/enterprise ownership — **not obtainable via an individual consumer OAuth grant.**
  [primary — GitHub docs] (3-0)
- Agent-fingerprinting from GitHub metadata (multiline-commit ratio [44.7% importance], PR
  structure, change stats, timing) hits **97.2% weighted F1 — but agent-vs-agent, with no human
  class and no FPR.** Says nothing about the AI-vs-human problem. (3-0)

**Read:** dead end for the low-friction OAuth path. The platform will not hand you a per-artifact
provenance signal, and the impressive metadata result is measured on the wrong problem.

### 5.6 Calibration / selective prediction — the one real mechanism

- **Conformal prediction** gives a **distribution-free, training-free, tunable guarantee that FPR ≤
  α**, empirically holding across α ∈ {0.2, 0.1, 0.05, 0.02, 0.01, 0.005}. This is *exactly* the
  "fixed low-FP operating point" a provenance tier needs. **[prose only][independent]** (3-0)
- **Caveat A — exchangeability:** "distribution-free" means *no parametric model*, **not** robustness
  to distribution shift. The guarantee holds only under calibration-vs-test **exchangeability** —
  most fragile across a repo's heterogeneous authors / languages / styles — and was **never tested on
  code.**
- **Caveat B — recall cost:** naively enforcing a strict low-FP bound causes a **"significant
  reduction" in recall.** (The paper's Multiscale variant partially recovers it — but the cost is
  real and must be measured, not assumed away.)

**Read:** the *only* honest engineering path to a "fixed low-FP" tier — but not a free "provable"
bound. It transfers only if MadeBy validates exchangeability on code and accepts the recall it buys
at α = 0.01–0.02.

### 5.7 Prevalence — sizing the miss

- **~25%+ of new code at Google is AI-generated** (Pichai, Q3 2024 earnings). [vendor/CEO]
- **76% of developers** use or plan to use AI tools; 62% currently use them. (Stack Overflow 2024) [survey]
- Vendor code-quality trend study over ~153M changed lines (GitClear, 2020–2023) — [vendor blog],
  directional only.

**Read:** the blind spot is large and growing, so the objection is real, not hypothetical. Caveat:
these size *AI-tool adoption*, not *untrailered* AI code specifically — that finer number is still
unmeasured (see §9).

---

## 6. Summary table — every signal against the bar

| Signal class | Best recall seen | Human-code FP | Regime | Verdict for low-friction MadeBy |
|---|---|---|---|---|
| Trained classifier (XGBoost/TF-IDF) | 98.7% | **~2%** | trained, GPT-3.5, Python, balanced snippets | **Does not transfer** — lab conditions |
| DetectCodeGPT (zero-shot) | AUROC 0.83 | **unreported** | zero-shot, multi-lang | Unusable as claim; FP unknown |
| DetectGPT4Code | TPR 20–60% | unreported | zero-shot | Too weak |
| Perplexity, Python / short code | — | unreported | zero-shot | **Collapses** (63.9% / 69.8% AUC) |
| Code stylometry | unstable | high (flip 16–56%) | any | **Fails** on short/idiomatic; adversarially trivial |
| Git forensics (size/cadence) | modest | **5–7%** | any | Refused already; correct call |
| GitHub Copilot API | — | n/a | OAuth | **No per-artifact provenance; wrong scopes** |
| GitHub metadata fingerprint | 97.2% F1 | **no human class** | OAuth | Measures agent-vs-agent, not AI-vs-human |
| Conformal prediction wrapper | tunable | **≤ α (provable)** | prose only, exchangeability-bound | **Only honest mechanism** — untested on code, costs recall |

---

## 7. The cautionary case (why the doctrine exists)

The prose-detection field ran MadeBy's experiment first, and the result is the doctrine's
justification:

- **GPT text detectors flag non-native English writers at a 61.3% false-positive rate**, while
  near-perfect on native writers. (Stanford, *Patterns* 2023) **[prose][peer-reviewed]**
- This is precisely MadeBy's cardinal sin: a trust brand publishing a **confident wrong label about
  a person**, concentrated on a **subpopulation** that did nothing wrong.
- The **code analogues are already visible** in this study: perplexity collapses on Python (§5.1);
  stylometry misfires on idiomatic/short code (§5.3). The subpopulations that would eat the false
  positives are *terse coders, Python/JS developers, and authors of conventional/boilerplate code* —
  i.e. a large, blameless slice of your users.
- **What the field did about it:** the mitigations that stuck were **thresholding, abstention, and
  human-in-the-loop** — a retreat toward exactly the fail-safe posture MadeBy already holds. The
  reputational damage (Turnitin/GPTZero controversies, falsely-accused students) is the cost of
  shipping a confident detector before measuring its FP on the vulnerable subpopulation.

For a company whose entire moat is honesty, this is not a side note — it is the reason the doctrine
is correct, now confirmed against the code literature.

---

## 8. Recommendation

1. **Keep the fail-safe doctrine for the headline / badge number.** No mirror or badge human/AI
   figure derived from behavioral or probabilistic inference. The evidence gives no signal that
   clears the honesty bar as a published attribution.

2. **Reframe detection as routing, not attribution — this is the unlock.** The blind-spot user needs
   to be *caught and redirected*, not *labeled*. A signal that says *"we see indications of AI here
   we can't confirm — run `capture --local` for the witnessed answer"* is:
   - **honest** — it makes no attribution claim; it reports a coverage gap + an unconfirmed prior;
   - **on-brand** — coverage-led framing already shipped (#79/#87);
   - **the call-to-action**, placed at first contact;
   - **tolerant of modest recall and modest FP** — a reversible, non-defamatory flag is categorically
     different from a published "38% AI" headline.

3. **If a probabilistic tier is ever built, gate it on three hard conditions:**
   - **(a) Measure the missing number first** — MadeBy's own **TPR@1%FPR on a real human-code
     corpus** (§4). No tier claim ships before this baseline exists.
   - **(b) Abstention-first** — selective classification / conformal prediction, defaulting to
     "can't tell → run capture" rather than guessing.
   - **(c) Language- and length-gated** — fire only where the signal is *measured* strong (C/C++,
     >50 LOC); **abstain on Python and short fragments**, where both perplexity and stylometry
     collapse and where the FP subpopulation lives.

4. **The highest-leverage lever is not a detector.** The study confirms the git-only accuracy gap
   cannot be closed honestly today. So the effort belongs on **coverage-led framing** (turn the blind
   spot into the CTA) and a **frictionless `capture --local`** (npx one-liner, second tool parser).
   Do not bet on the detector; bet on making the accurate path trivial.

**Net:** *Is the doctrine too conservative?* For publishing a number — **no, it is correct, and the
code literature now confirms it.* For catching-and-routing the blind-spot user — the doctrine was
never the obstacle; the framing was. Fix the framing, not the doctrine.

---

## 9. Open questions (what to measure next)

1. **TPR@1%FPR of the best zero-shot code detectors** (DetectCodeGPT, Binoculars-for-code) at a
   fixed low-FP operating point on **arbitrary real-world human repos** — the number no reviewed
   paper reports; MadeBy must generate it.
2. **Does the conformal FPR≤α bound survive on code** across heterogeneous authors / languages
   (exchangeability), and **how much recall survives at α = 0.01–0.02?**
3. **Can GitHub-OAuth-reachable metadata** (multiline-commit ratio, change-concentration, off-hours
   / handoff-latency timing) be recombined into an **AI-vs-human** classifier holding ≤1–2% FP
   against a **real human-commit baseline** — untested, since the source study had no human class?
4. **Current real-world prevalence of *untrailered* AI code specifically** (not AI-tool adoption) —
   to size the miss precisely and decide whether the false-positive risk is worth it.

---

## 10. What this changes (and doesn't)

- **Unchanged:** the primary strategy (mirror → verified tier), the fail-safe doctrine, and the
  refusal of diff-size/cadence heuristics — all confirmed by the evidence.
- **Sharpened:** "frictionless capture" rises from a packaging nicety to the **key adoption blocker**;
  and detection work is redirected from *attribution* to *routing/abstention*.
- **New workstream (optional, gated):** a human-code false-positive baseline corpus — the
  prerequisite for any future probabilistic tier and, independently, a publishable honesty asset.

---

## 11. Claims the verification pass KILLED (do not cite)

Quarantined so they are not repeated from memory:

- ❌ "Claude Code only 0.57 detection recall" (voted 0-3) — misreads the agent-fingerprinting paper.
- ❌ "Zero-shot code authorship ~69–71% accuracy among 5 candidate authors" (voted 1-2) — not
  robustly supported.
- ❌ "Code stylometry collapses to ~35–37% at 104 authors" (voted 0-3) — not supported as stated.

---

## 12. Source register

**Primary / academic (code):**
- Perplexity efficacy on code — arXiv **2412.16525v2** ("One Size Does Not Fit All")
- DetectCodeGPT — **github.com/YerbaPage/DetectCodeGPT**
- Trained + zero-shot code classifiers (XGBoost/TF-IDF, DetectGPT4Code) — arXiv **2405.15512**
- Large-scale real-repo AI-code study (git forensics) — arXiv **2603.27130**
- Code-stylometry fragility / adversarial refactor flips — arXiv **2506.17120**
- GitHub-metadata agent fingerprinting — arXiv **2601.17406v1**

**Primary / academic (calibration, prose):**
- Conformal FPR≤α bound (Multiscale Conformal Prediction, ACL 2025) — arXiv **2505.05084**
- Binoculars zero-shot detector — arXiv **2401.12070**
- Additional calibration/selective-prediction sources — arXiv 2507.23113, 2403.06009, 2308.08381v3

**Primary (platform):**
- GitHub Copilot Metrics API — **docs.github.com/en/rest/copilot/copilot-metrics**

**Cautionary / prevalence:**
- Non-native-English FP bias — *Patterns* 2023 / **PMC10382961** [peer-reviewed]
- The Markup, "AI detection tools falsely accuse international students" [secondary]
- Fortune / Pichai, "~25% of new code at Google is AI" [secondary/vendor]
- Stack Overflow 2024 Developer Survey — AI adoption [survey]
- GitClear, code-quality trend study [vendor blog]

*Verification: 25 claims → 22 confirmed (3-0 or 2-1), 3 refuted (§11), 0 unresolved.*
