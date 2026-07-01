# Customer Development — Prospective-User Evaluation

*Perspective: an experienced open-source developer evaluating MadeBy as a potential user, based
on both the specs and the in-progress code (all 7 packages, 175 tests passing at time of review).*

## Verdict up front

I'd **watch it and probably run the CLI once out of curiosity — but I would not put a badge in
my README yet, and I couldn't buy the paid tier if I wanted to (it isn't built).** The thinking
here is unusually rigorous and the code is honest and clean, but today the low-friction path gives
wrong answers for the target user, and the accurate path is high-friction and Claude-Code-only.
It's a credible foundation, not yet an adoptable product.

## Why I'd take it seriously

**The intellectual honesty is real and it's in the code, not just the pitch.** `GROUND-TRUTH.md`
reports the headline number as *0% recall on untrailered AI* (`GROUND-TRUTH.md:38`) — the single
most damning metric for the whole premise — and reports it *as the headline* instead of hiding it
behind the synthetic benchmark's flattering 0.77. It even calls out that its own dogfood canary is
circular (`GROUND-TRUTH.md:9-11`). I have reviewed a lot of provenance/"AI detector" projects;
almost none do this. For a company whose product *is* trust, modeling that honesty in its own
metrics is the most persuasive thing here.

**The failure-safe discipline is enforced, not aspirational.** `tiers.ts` caps everything
unrecognized at `asserted`; `fingerprint.ts:isNativeFingerprint` structurally blocks re-hashing
into a MadeBy envelope (invariant #1); the classifier holds **0 human false-positives**
(`BENCHMARK.md:47`) and explicitly refuses diff-size/cadence heuristics that would over-claim AI
about a person. That "never over-claim about a human" line is exactly the right cardinal sin to
pick, and they hold it in code.

**`capture --local` is the genuinely good idea.** `capture-local.ts` reads your *own* AI session
log, structurally fingerprints what the model wrote, and only attests the parts that are actually
present in the committed file — AI work that didn't survive gets honestly discarded
(`capture-local.ts:94-97`). The witness is the tool's own record, anchored by a reformat/rebase-
surviving structural fingerprint. That's a real evidence story, not vibes, and the privacy posture
(only derived attribution leaves the engine) is sound.

**Engineering quality is high.** Small pure functions, dependency-light, well-commented with the
*why*, a proper two-regime test split (deterministic core with conformance vectors + Stryker
mutation testing; probabilistic classifier measured/calibrated and never "proven"), and a
standalone offline verifier so "don't trust us, verify" is executable. This reads like someone who
has built trust infrastructure before.

## Why I wouldn't adopt it yet

**1. The viral path is systematically wrong for the exact audience it targets.** The GTM is the
curiosity mirror — "how much of my code is AI?" — aimed at vibe-coders. But the web analyzer
(`/api/analyze`) is trailer-only: `classify.ts` matches `Co-Authored-By`/`Generated-by` trailers
and author names. Heavy Copilot/Cursor *inline* users emit no trailer, so the analyzer will tell
them they're ~100% human — the wrong answer, and a boring one. The strategy doc knows this
("under-claiming is the fatal bug," `STRATEGY.md:314`), but the low-friction acquisition path still
ships the signal that fails for the people it wants. The accurate path (`capture --local`) requires
running a CLI against local logs. So: **accurate is high-friction, low-friction is inaccurate** —
and that gap sits exactly on the flywheel's ignition point.

**2. It's really "how much did Claude Code write," not "AI."** `tool-parsers.ts` ships only the
Claude Code parser; Cursor/Copilot/Windsurf/Aider are declared-but-unbuilt (honestly — they wait
for real sample logs). Principled, but if I use Cursor, the good path has nothing for me today.

**3. The structural match is a similarity heuristic wearing "witnessed" clothes.** `structural.ts`
canonicalizes identifiers to `ID` and numbers to `NUM`, feature-hashes into a 256-dim embedding,
cosine-matches at a hardcoded `0.5` threshold. They admit the false-positive risk between
structurally-identical-but-semantically-different code (`structural.ts:35-38`). The *witness* (the
session log) is strong; the *linkage to committed bytes* is fuzzy and will be noisy on small or
heavily-edited files. Fine as a signal, but it's not the byte-exact binding the "bound" tier
rhetoric implies.

**4. Specs-heavy, product-light.** ~200KB of strategy/architecture/review prose against a real-but-
thin implementation. The DB, ingestion (Modal), and badge worker are stubs; there's no hosted
resolver, no identity/verification/signing flow — and *verified* is the stated primary monetization
line (`STRATEGY.md:388`). So the entire paid value proposition doesn't exist yet, and the network
the badge depends on is empty. As a user I can run one CLI and get JSON. The planning-to-shipping
ratio is high.

**5. Cold-start is honestly diagnosed but not solved.** `STRATEGY.md §4` is the best writeup of the
network-effect death-trap I've seen in a spec — and then the proposed escape hatch (the single-
player mirror) is undercut by problem #1. The registry, badge, and resolver are worth ~zero until
others participate, and the one thing that's supposed to work with zero network is the thing that
misreports heavy AI users.

## What would flip me to "yes"

- Ship one non-Claude parser (Cursor or Copilot) so the witnessed path covers a second tool.
- Make the web analyzer *lead* with coverage ("we can only see trailered commits; run
  `capture --local` to see the rest") instead of quietly under-counting — turn the blind spot into
  the upgrade CTA at the point of first contact.
- Stand up the resolver + one end-to-end verified badge so there's something real to click through
  to.

## Net

I respect this more than most funded provenance projects, and the honesty makes me *want* it to
work. But "would I use it?" today is a soft no — I'd star it, run `capture --local` on one repo to
see my own breakdown, and check back when there's a live resolver and a second tool parser.
