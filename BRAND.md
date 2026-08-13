# MadeBy — Brand Guide

*How MadeBy looks and sounds. Downstream of `MISSION.md`. When they disagree, the mission wins. The
rendered guide (swatches, type specimens, the badge) is the companion to this spec; this file is the
source of truth for the values.*

---

## Essence

A ledger, not a billboard. Our brand is a trust instrument. It reads like a record, not an ad. Calm.
Rigorous. Plainspoken.

Five traits:

- **Honest above all.** Say only what's true. Show the gap. Never over-claim.
- **Rigorous, but plain.** Precise as a proof. Plain as Hemingway. Name things by what they are.
- **Calm & neutral.** A record, not an alarm. Celebrate disclosure. Never accuse or shame.
- **Symmetric & fair.** Human and machine, equal. `made by hi` and `made by ai` get the same respect.
- **Timeless.** Built to outlast a trend. The printed record and the notary's seal, not the dashboard.

Tie-breakers, in order: **be honest, be fair, be clear.**

---

## Wordmark & seal

The wordmark is **madeby**. One word. Lowercase. Mono. It reads as "made by" — it finishes the
sentence the product asks.

The **seal** is a brass dot in a soft ring. A wax seal, reduced. It marks something attested and on
the record.

Rules:

- Lowercase in the mark. Prose may write "MadeBy" as the company.
- Mono type only for the wordmark.
- The seal sits left of the word, centered. Keep one seal-width of clear space.
- Never recolor the seal to signal status. Status lives in the badge and the tiers. Never the logo.

---

## Color

Cool ink. One brass seal. The palette is quiet by design: honest, slightly cool neutrals, one warm
brass accent. Green means verified. It is earned, never decorative.

Every color is a token. A light value and a dark value. Nothing hardcoded.

| Token | Light | Dark | Role |
|---|---|---|---|
| Brass — accent | `#8A5D0C` | `#D8AC57` | The seal. The one warm mark. Attestation, "on the record." |
| Ink | `#171C1E` | `#E8ECEE` | Primary text, strong marks. A cool near-black, never pure black. |
| Muted | `#59646A` | `#93A1AB` | Body copy, secondary text. |
| Faint | `#8A949A` | `#6D7B85` | Eyebrows, captions, the quietest labels. |
| Verified green | `#2F6E3B` | `#63B37E` | Earned. Passing gates, the verified tier. |
| Paper (ground) | `#EEF1F0` | `#10151A` | The background. A grey with a faint cool bias — chosen, not default. |
| Surface | `#FBFCFB` | `#161C22` | Cards, panels, raised elements. |
| Line | `#D7DDDB` | `#27303A` | Hairline rules and borders. The ledger's ruling. |

Discipline:

- Keep brass rare. One accent per view.
- Green means verified. Nothing else.
- Absence is neutral grey. Never red. Never a warning. (The anti-shame rule, made visual.)

---

## Typography

Three voices: record, prose, machine.

- **Display — serif.** `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia,
  "Times New Roman", serif`. The printed record. Authority. Permanence.
- **Body — sans.** `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
  Plain and legible.
- **Data — mono.** `ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas,
  monospace`. Labels, code, hashes, the wordmark, the badge.

The pairing is the thesis. Human record meets machine-readable data.

System stacks by design. No webfonts. No external dependency. Fitting for a trust tool. Headings
balance (`text-wrap: balance`). Body stays near 65 characters. Lined-up digits use tabular numerals.

---

## The badge

A pointer, never proof. It links to the resolver page. The page is the answer.

Two rows:

- **Composition** — completes "made by ___". Names the disclosed authors: `hi`, `ai`. Never a number.
  ("madeby 97%" is not a sentence.)
- **Coverage** — `known X%`. How much of the authorship *type* we know. Not merely that something was
  disclosed.

Rules:

- Automation is off the headline, on the page. A bot is not `ai`. Overridable by attestation.
- A bare signature proves *who*, not *what*. It sets the tier. It never counts as `hi`.
- Tier is the composition segment's color. Never a "% AI" ratio. Anywhere.

Full spec: `ARCHITECTURE.md §9`.

---

## Trust-tier colors

Color carries the evidence. Four tiers, four colors. The same everywhere the tier shows.

| Tier | Color | Hex | Means |
|---|---|---|---|
| Asserted | slate | `#5F6A72` | Stated. Unverified. |
| Sworn | bronze | `#8A6D1F` | A signed legal declaration. |
| Verified | green | `#2F6E3B` | A checkable signature. |
| Bound | deep green | `#1C4D2B` | Bound to the exact bytes. |

Slate → bronze → green → deep green. Neutral where there's only a say-so. Warm where a person swears.
Green where math can check it. The gradient is the upgrade pull.

---

## Voice & tone

The words are the product too. Celebrate transparency. Stay neutral on its absence. Never accuse.
Never shame. Never claim more than we can see.

**Write like Hemingway.** Short, declarative sentences. Concrete nouns. Strong verbs. Cut the adverb.
One idea per sentence. Say less — the record says the rest.

> wordy: *"MadeBy never attempts to guess whether a given piece of code was written by an AI, because
> doing so would risk falsely accusing a contributor who may not have used one."*
>
> ours: *"We don't guess. We don't accuse. The maker speaks. We keep the record."*

Say this / never this:

| ✓ Say | ✗ Never |
|---|---|
| made by hi + ai | 97% AI · appears AI-written |
| known 62% | 97% human |
| provenance not yet disclosed | hides its origins |
| add verified provenance | clear your record · failing grade |
| we can't verify who made this | no signal found |

Also: lowercase verbs (`who`, `ai`, `me`, `check`, `init`). No exclamation points. Name the creator.
Uncertainty goes in the tier.

---

*Why it looks like this: a serif that reads like a printed record; mono for the machine-readable truth
beneath it; one brass seal for the notary's mark of attestation; cool, unexcitable inks so nothing
feels like an accusation. The form is the argument.*
