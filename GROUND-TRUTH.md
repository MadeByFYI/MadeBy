# Classifier Ground-Truth Report (correctness)

**Component:** `@madeby/classify` · **Corpus:** `ground-truth-v0` · **Harness:** `runGroundTruth()` over
`packages/classify/src/benchmark/ground-truth-v0.json` · **Status:** estimate.

> **Why this exists (review 2026-06-29).** Two earlier signals were *not* correctness checks:
> the dogfood canary tests our trailer-regex against `Co-Authored-By` trailers *we wrote*
> (reproducibility, not correctness — it's circular), and the synthetic `benchmark-v0` reports a
> blended recall of 0.77 that **hides** the real-world blind spot. This corpus fixes both: every
> label rests on provenance **other than the trailer the classifier reads**, and it reports the
> number that matters honestly — **recall on untrailered AI**.

## Independence: where the labels come from

Each case is labeled by one of:
- **Era** — commits that predate LLM coding assistants (e.g. git's 2005 initial commit) are
  definitionally human.
- **Autonomous-agent account** — commits authored by an AI agent's own account.
- **Publicly-documented AI build** — features the developer publicly credited to an AI tool, where
  the commit itself carries **no trailer** (the blind-spot class).

None of these labels is derived from the trailer the classifier reads, so passing is genuine
correctness, not circularity. Cases are a mix of cited-real public commits and representative-of-class
commits; the label basis is documented per case (`provenanceBasis`). Reproduce:

```bash
pnpm --filter @madeby/classify test   # runs ground-truth.test.ts
```

## Measured results (ground-truth v0, 27 cases)

*Grown 2026-08-13 (`PRE-INCORPORATION §7.4`): +7 REAL cited public commits — 4 pre-LLM-era human
(redis 2009, rails 2005, django 2008, sinatra 2007) and 3 autonomous-agent (Cursor, Copilot, Devin),
each a verifiable `repo@sha`, replacing representative stand-ins with real data.*

| Metric | Value |
|---|---|
| Overall accuracy | **74%** (20/27) |
| **Human false-positives** | **0** — never over-claims AI about a person (now on 13 human cases, 4 real-cited) |
| **Recall on IDENTIFIABLE AI** | **1.00** (7/7) — trailers + agent identities are strong evidence; the real Cursor and Copilot commits confirm it (#78) |
| **Recall on UNTRAILERED AI** | **0.00** (0/7) — **the real-world blind spot**, now including a real Devin miss |

### The headline, stated plainly

**A trailer-only classifier cannot detect AI that left no trailer — its recall on untrailered AI is
0%.** Inline autocomplete (Copilot/Cursor tab), squashed/stripped trailers, and tools that don't
emit `Co-Authored-By` all fall in this gap — and it disproportionately hits the heaviest AI users
(the vibe-coders the strategy targets). The synthetic benchmark's 0.77 averaged this away; here it
is the headline. The overall 74% accuracy is *dragged down by these honest misses* — we report that
rather than tune it up.

### What the real cases surfaced (the growth paid off)

Sourcing **real** agent commits — not stand-ins — exposed things the representative corpus hid:

- **Untrailered AI is not always invisible.** The real Copilot coding-agent commit
  (`beacon@492668ba`) carries **no trailer of any kind**, yet is caught — because the agent is the
  git **author**, so its identity *is* the signal. When an agent authors directly, we see it; the
  blind spot is specifically AI committed *under a human's name*.
- **A recoverable miss: agent identity discarded by `[bot]`-precedence.** The real Devin commit
  (`trade@627b2b5d`) is authored by `…+devin-ai-integration[bot]@users.noreply.github.com`. `devin`
  is a known AI pattern, but `isBotIdentity()` is checked **first**, and the noreply email embeds
  `[bot]` — so it classifies as generic **`bot`**, not `ai`. The AI signal is *present and disclosed*
  but thrown away by precedence. This is a **different** blind spot from autocomplete — and a
  **recoverable** one (a precedence refinement, reading a disclosed identity, no inference). The old
  representative Devin case (`devin@cognition.ai`, no `[bot]`) masked it by classifying `ai`. See
  **"Closing the gap"** below — this is the cheapest real recall win on the board.

What we do **not** do: infer AI from diff-size/cadence heuristics to paper over the gap. They are
frequently wrong and would over-claim about people who never opted in — the one sin the doctrine
forbids (note the **0 human false-positives** above; we hold that line).

## Closing the gap (the honest path, not a heuristic)

- **Recover agent identities lost to `[bot]`-precedence (newly surfaced, cheapest win)** — an
  autonomous-agent account whose identity matches a known AI pattern (`devin`, `copilot`, `cursor`, …)
  should classify as `ai`, not generic `bot`, even when its noreply email embeds `[bot]`. Generic
  automation (dependabot, renovate) matches no AI pattern and stays `bot`. This reads a **disclosed
  identity** — not an inference — so it raises untrailered recall *with evidence* and stays inside the
  doctrine. Recommended as a focused follow-up (touches `classify.ts` precedence + the soundness
  assertions here; it is a classification-semantics call — an autonomous coding agent is `ai`, not a
  version-bump `bot`).
- **Witnessed session-log evidence (#68)** — the highest-fidelity honest signal. When a repo records
  its AI tools' session logs into `.madeby/`, that AI work is counted even with no trailer. This is
  the real recall fix for the *autocomplete* sub-class, and it raises the untrailered number *with
  evidence*.
- **Captured corrections (#69)** — every "this is wrong" correction is labeled data that grows this
  corpus, so the measurement improves with use.
- **Real labeled repos** — replace representative cases with cloned repos of established provenance
  over time.

## How this corpus differs from the others

| Artifact | Role | Honest about |
|---|---|---|
| Dogfood canary (this repo) | **reproducibility / regression** only — no longer treated as accuracy ground truth | — |
| `benchmark-v0` (synthetic) | **calibration / regression** (confidence vs. accuracy) | blended recall |
| `ground-truth-v0` (this) | **correctness** | untrailered-AI recall = 0% |
