# Structural-Match Threshold Calibration (#86)

**Component:** `@madeby/analyzer` — `capture-local`, the witnessed-span capture behind `madeby ai`.
**Harness:** `packages/analyzer/src/match-calibration.ts` (`runMatchCalibration()`) over a labeled corpus.
**Regime:** calibration (`TESTING.md` §5) — precision/recall from labeled data, **not** a soundness proof.
**Status:** estimate — every number here is a measured estimate over the corpus, never a guarantee.

> **Why this report exists.** `capture-local` turns an AI tool's session log into *witnessed* span
> evidence by confirming the content the tool recorded is structurally present in the committed file.
> The cosine floor that gates "present vs. not" is **the one place a witnessed attestation can
> over-claim** — attest AI content that isn't actually what shipped. It was a hardcoded `0.5`. This
> report replaces that magic number with a value **chosen from labeled data, biased toward discard**
> (precision over recall: never attest AI that didn't land), and publishes its precision/recall — and,
> honestly, the residual no threshold can fix.

## How to reproduce

```bash
pnpm --filter @madeby/analyzer test   # runs match-calibration.test.ts
```

Or call the harness directly: `import { runMatchCalibration } from "@madeby/analyzer"` → returns the
full report (chosen threshold, precision/recall, the sweep, and the collision residual).

## Result

| | |
|---|---|
| **Chosen threshold** | **0.52** (was an uncalibrated `0.5`) |
| **Precision at 0.52** | **1.00** — never attests AI that didn't ship (the sev-0 direction) |
| **Recall at 0.52** | **1.00** — catches reformatted / renamed / commented / substantial-fragment matches |
| **Precision-1.0 band** | `0.45 < t ≤ 0.60` — chosen = the **midpoint** (0.52) for discard-biased margin |

The threshold is the midpoint of the band, not its recall-maximizing edge: it sits with margin above
the highest genuine negative (0.45) and below the lowest true positive (0.60), the most robust
precision-1.0 point. `capture-local`'s `MATCH_THRESHOLD` is asserted equal to this derived value by
the test, so it cannot silently drift from the corpus.

## The corpus (labels from the transform, not from the score)

Positives are the AI's content *as it shipped* under a structure-preserving change; negatives are cases
where attesting the AI would over-claim.

| similarity | label | transform |
|---|---|---|
| 1.000 | match | exact |
| 1.000 | match | rename (identifiers changed, structure identical) |
| 1.000 | match | comments added |
| 0.804 | match | minor edit (one guard line added after) |
| 0.801 | match | reformat (whitespace/semicolons collapsed) |
| 0.602 | match | **substantial fragment** (AI wrote one of three functions) |
| 0.447 | discard | **tiny fragment** (AI wrote one line of a large file — attesting the file over-claims) |
| 0.173 | discard | unrelated content at the path |
| 0.091 | discard | rewrite (same task, different structure — the AI's version didn't ship) |

The gap between the highest discard (0.447) and the lowest match (0.602) is where 0.52 sits.

## Threshold sweep

| threshold | precision | recall | note |
|---|---|---|---|
| 0.40 | 0.86 | 1.00 | tiny-fragment (0.447) leaks in → a false positive |
| **0.45** | **1.00** | 1.00 | band opens |
| **0.52** | **1.00** | **1.00** | **chosen (discard-biased midpoint)** |
| 0.60 | 1.00 | 1.00 | band closes |
| 0.65 | 1.00 | 0.83 | substantial fragment (0.602) now discarded — recall lost |

## The residual we do **not** hide

Structural-v1 canonicalizes identifiers and numbers (rename-robustness), so **same-structure,
different-content** code collides near 1.0 — two different 3-field interfaces, two different getters,
two different single-query functions all score ~1.000. **No threshold separates these**, and all 3
collision cases in the corpus match at 0.52. This is the precision ceiling of structural-only matching,
and it is surfaced, not tuned away. What bounds it in practice:

- **Path-anchoring.** The match compares the AI's recorded content against the committed content *at
  the same path* — not against arbitrary code — so a collision requires same-shape/different-meaning
  content at that exact file, a narrow window.
- **Self-attestation.** The operator attests *their own* session log against *their own* commit; there
  is no adversarial incentive to over-claim content you didn't write.
- **Fail-safe tier.** A witnessed span is the **asserted** tier — self-reported, capped, never minted
  to a higher tier by this match. A collision inflates recall of a self-claim; it cannot forge trust.

**Closing it later** (not this ticket): a less-aggressive canonicalization (keep operators/literals),
or pairing the structural signal with an exact-ish token overlap, would raise precision on collisions
at some cost to rename-robustness — a calibration to run when the residual is shown to bite.
