# Classification Benchmark & Calibration Report

**Component:** `@madeby/classify` — the *probabilistic* regime of MadeBy's trust system.
**Benchmark version:** `v0`
**Harness:** `packages/classify/src/eval.ts` (`runEval`) over `packages/classify/src/benchmark/benchmark-v0.json`
**Status:** estimate — every number here is a measured estimate, never a guarantee.

> **Why this report exists.** MadeBy sells trust, so it keeps two test regimes strictly
> separate (`TESTING.md` §1). The deterministic *soundness* core (`@madeby/core`) is verified by
> exact conformance vectors, a mutation gate, and a red-team harness — pass/fail, no statistics.
> The *probabilistic* classifier — "was this commit human, AI, or human-with-AI?" — cannot be
> proven correct; it can only be **measured and calibrated**. This report is that measurement,
> and it is reproducible: `runEval()` is exported and the labeled benchmark is in the repo.

## How to reproduce

```bash
pnpm --filter @madeby/classify test   # runs eval.test.ts (regression floors)
```

Or call the harness directly: `import { runEval } from "@madeby/classify"` → returns the full
`EvalReport` (accuracy, confusion matrix, AI-involvement precision/recall/F1, per-confidence
calibration, ECE).

## Methodology

- **Signal (v0):** commit-level only — `Co-Authored-By:` trailers plus the commit author
  name/email, matched against an open-ended provider list (Anthropic/Claude, GitHub Copilot,
  Cursor, Cognition/Devin, Google/Gemini, OpenAI/ChatGPT/Codex). Unknown AI tools read as human
  until added — a deliberate **false-negative bias** (the safe direction: we under-claim AI
  involvement rather than over-claim it).
- **Classes:** `human` · `ai` (AI author, no human) · `with_ai` (human author + AI co-author).
- **Confidence model:** an explicit AI trailer/author is strong evidence → high confidence
  (`with_ai` 0.90, `ai` 0.85). `human` rests on the *absence* of an AI signal — weak evidence —
  so it is deliberately lower (0.55).
- **Benchmark:** 21 labeled commit cases spanning clear-human, human edge cases (prose that
  *mentions* "AI"/"Claude" but has no AI co-author → must not false-positive; human co-authors),
  trailered `with_ai`, bot-authored `ai`, and — critically — **untrailered AI-assisted** commits
  labeled `with_ai` that the commit-level signal *cannot* catch. Those are included on purpose so
  recall is reported honestly, not inflated by omitting the hard cases.

## Measured results (benchmark v0, 21 cases)

| Metric | Value |
|---|---|
| Overall accuracy | **85.7%** (18/21) |
| AI-involved **precision** | **1.00** (0 false positives) |
| AI-involved **recall** | **0.77** (10/13; misses 3 untrailered) |
| AI-involved **F1** | **0.87** |
| Expected Calibration Error (ECE) | **0.15** |

### Confusion matrix (actual → predicted)

| actual ↓ / predicted → | human | ai | with_ai |
|---|---|---|---|
| **human** | 8 | 0 | 0 |
| **ai** | 0 | 4 | 0 |
| **with_ai** | 3 | 0 | 6 |

The only errors are in one cell: 3 `with_ai` commits predicted `human`. All three are the
untrailered AI-assisted cases — the classifier saw no AI signal and fell to `human`. There are
**zero false positives**: no human-authored commit was ever labeled AI-involved.

### Calibration (predicted confidence vs. observed accuracy)

| Confidence | n | Observed accuracy |
|---|---|---|
| 0.55 (`human`) | 11 | 0.73 |
| 0.85 (`ai`) | 4 | 1.00 |
| 0.90 (`with_ai`) | 6 | 1.00 |

The `human` confidence of 0.55 is well-aligned with its observed 0.73 accuracy (slightly
under-confident — the safe direction). High-confidence AI predictions are exactly right on this
benchmark. ECE of 0.15 reflects that the high-confidence buckets are perfectly accurate while the
deliberately-cautious `human` bucket carries the small remaining gap.

## Honest limitations

1. **Recall is bounded by the signal, by design.** The commit-level v0 signal *only* sees
   trailers and authors. AI assistance with no trailer is invisible to it — the 3 missed cases.
   This is the headline limitation, and it is exactly why MadeBy never reports a precise
   "human vs AI" percentage from commits alone. Span-level evidence and session-log ingestion
   (tickets #2 / #10) are the path to higher recall; until then, recall is honestly ~0.77.
2. **Small, synthetic benchmark.** 21 hand-labeled cases are enough to guard against regressions
   and to calibrate confidence, not to claim a population-level accuracy. Treat the numbers as
   directional. The benchmark will grow (and version) as real corpora are labeled.
3. **Precision is high because trailers are reliable, not because detection is hard to fool.** A
   forged trailer would be believed at the classification layer. That is acceptable because
   classification is the *estimate* layer; cryptographic binding and tiering live in
   `@madeby/core`, which fails safe to `asserted` and is red-teamed separately (`RED-TEAM.md`).
4. **English/Latin-script provider names only (v0).** Matching is regex over known provider
   strings.

## What the eval gates

Per `TESTING.md` §8, `eval.test.ts` enforces **regression floors**, not a per-case pass/fail gate:
accuracy ≥ 0.70, AI-involved precision ≥ 0.90 (the sev-0 over-claiming direction), recall ≥ 0.60
and < 1.0 (recall must stay honest — a "perfect" recall here would mean the untrailered cases were
quietly dropped), and ECE ≤ 0.30. The floors sit below the measured numbers so honest improvements
pass freely while a real regression — especially a precision drop — fails the build.
