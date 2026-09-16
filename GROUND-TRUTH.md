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

*Grown 2026-08-13: +7 REAL cited public commits — 4 pre-LLM-era human
(redis 2009, rails 2005, django 2008, sinatra 2007) and 3 autonomous-agent (Cursor, Copilot, Devin),
each a verifiable `repo@sha`, replacing representative stand-ins with real data.*

| Metric | Value |
|---|---|
| Overall accuracy | **78%** (21/27) |
| **Human false-positives** | **0** — never over-claims AI about a person (now on 13 human cases, 4 real-cited) |
| **Recall on IDENTIFIABLE AI** | **1.00** (8/8) — trailers + agent identities are strong evidence; real Cursor, Copilot **and Devin** commits confirm it (#78) |
| **Recall on UNTRAILERED AI** | **0.00** (0/6) — **the real-world blind spot** (inline autocomplete / AI committed under a human's name) |

### The headline, stated plainly

**A trailer-only classifier cannot detect AI that left no trailer — its recall on untrailered AI is
0%.** Inline autocomplete (Copilot/Cursor tab), squashed/stripped trailers, and tools that don't
emit `Co-Authored-By` all fall in this gap — and it disproportionately hits the heaviest AI users.
The synthetic benchmark's 0.77 averaged this away; here it
is the headline. The overall 78% accuracy is *dragged down by these honest misses* — we report that
rather than tune it up.

### What the real cases surfaced (the growth paid off)

Sourcing **real** agent commits — not stand-ins — exposed two things the representative corpus hid:

- **Untrailered AI is not always invisible.** The real Copilot coding-agent commit
  (`beacon@492668ba`) carries **no trailer of any kind**, yet is caught — because the agent is the
  git **author**, so its identity *is* the signal. When an agent authors directly, we see it; the
  blind spot is specifically AI committed *under a human's name*.
- **A recovered miss: agent identity was discarded by `[bot]`-precedence — now fixed.** The real
  Devin commit (`trade@627b2b5d`) is authored by `…+devin-ai-integration[bot]@users.noreply.github.com`.
  `devin` is a known AI pattern, but `isBotIdentity()` was checked **first**, and the noreply email
  embeds `[bot]` — so it classified as generic **`bot`**, not `ai`: a *disclosed* AI signal thrown
  away by precedence. **Fixed 2026-08-13** — a `[bot]` identity that is itself a named AI agent now
  classifies `ai` (reading the disclosed identity, no inference); generic automation matches no AI
  pattern and stays `bot`. This lifted identifiable-AI recall to a genuine **8/8** and accuracy to
  78%. The old representative Devin case (`devin@cognition.ai`, no `[bot]`) had masked the gap by
  never exercising the `[bot]`-email path.

What we do **not** do: infer AI from diff-size/cadence heuristics to paper over the gap. They are
frequently wrong and would over-claim about people who never opted in — the one sin the doctrine
forbids (note the **0 human false-positives** above; we hold that line).

## Closing the gap (the honest path, not a heuristic)

- **Recover agent identities lost to `[bot]`-precedence — DONE (2026-08-13).** An autonomous-agent
  account whose identity matches a known AI pattern (`devin`, `copilot`, `cursor`, …) now classifies
  as `ai`, not generic `bot`, even when its noreply email embeds `[bot]`. Generic automation
  (dependabot, renovate) matches no AI pattern and stays `bot`. This reads a **disclosed identity** —
  not an inference — so it stays inside the doctrine (an autonomous coding agent is `ai`, not a
  version-bump `bot`). Implemented in `classify.ts` precedence + covered in `classify.test.ts`.
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
