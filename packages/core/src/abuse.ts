// Social/economic abuse controls for the open free tier (#72, ARCHITECTURE §11 / TESTING). The
// crypto red-team covers *forgery*; this covers the larger surface of "let anyone assert anything" —
// mass-squatting and adjudication-by-display. Pure, node-free: it FLAGS and BOUNDS, it never
// adjudicates or deletes (invariant #9 — competing claims are ranked + labeled, never suppressed).
// Identity-cost (OAuth on asserted claims) and API metering are app-layer and ride the live app;
// this is the detection/bounding half that is buildable without it.

import type { Claim } from "./model";
import type { ClaimStanding } from "./contention";

function add(m: Map<string, Set<string>>, key: string, value: string): void {
  let s = m.get(key);
  if (!s) {
    s = new Set();
    m.set(key, s);
  }
  s.add(value);
}

// --- Control 1: bound "adjudication by display" ---------------------------------------------------
// A contested subject must never render unboundedly: a flood of cheap asserted claims would drown the
// evidence-backed ones and let sheer volume masquerade as consensus. Show every evidence-backed claim
// (tier above 'asserted') plus a bounded head of the asserted tier; collapse the remainder behind a
// labeled count. Nothing is dropped from the data — only from the default view.

export interface BoundedClaims {
  /** the claims to render (all non-asserted, then up to maxAsserted asserted — in the given order) */
  shown: ClaimStanding[];
  /** how many asserted claims were collapsed behind the expander */
  collapsed: number;
  /** label for the expander, e.g. "12 other asserted claims" (undefined when nothing collapsed) */
  collapsedNote?: string;
}

/**
 * Bound the rendered claim set. `standings` must already be ordered by evidence (resolveContention).
 * Evidence-backed claims (tier above 'asserted') always render; asserted claims render up to
 * `maxAsserted` (default 3), the rest collapse into a count. The evidence order means the dominant /
 * frontier claim is always in the shown head.
 */
export function boundClaimStandings(standings: readonly ClaimStanding[], opts: { maxAsserted?: number } = {}): BoundedClaims {
  const maxAsserted = Math.max(0, opts.maxAsserted ?? 3);
  const shown: ClaimStanding[] = [];
  let assertedShown = 0;
  let collapsed = 0;
  for (const s of standings) {
    if (s.authenticity === "asserted") {
      if (assertedShown < maxAsserted) {
        shown.push(s);
        assertedShown += 1;
      } else {
        collapsed += 1;
      }
    } else {
      shown.push(s); // sworn / verified / bound — evidence-backed, always rendered
    }
  }
  return { shown, collapsed, collapsedNote: collapsed > 0 ? `${collapsed} other asserted claim${collapsed === 1 ? "" : "s"}` : undefined };
}

// --- Control 2: corpus-poisoning detection --------------------------------------------------------
// Mass-squatting: one actor asserts authorship over many distinct subjects to poison the index.
// "Cheap" = unsigned (an unsigned claim cannot exceed 'asserted' anyway, invariant #3), so it carries
// no crypto/identity cost. We FLAG actors whose cheap-claim spread crosses a threshold — a signal for
// the trust-&-safety dashboard / human review, NEVER an auto-verdict (we don't delete or demote by
// fiat). It pairs with identity-cost (OAuth), which raises the price of generating the pattern.

export interface PoisonFlag {
  actorId: string;
  /** distinct subjects this actor claims (any tier) */
  subjectCount: number;
  /** distinct subjects this actor claims with a cheap (unsigned) claim — the poison signal */
  cheapSubjectCount: number;
  reason: string;
}

/**
 * Flag actors whose cheap (unsigned) authorship claims span at least `threshold` (default 10) distinct
 * subjects. A flag is a prompt to REVIEW, not a judgement — prolific genuine authorship exists; this
 * surfaces the pattern for a human/T&S look. Signed (identity-cost-paid) claims never count.
 */
export function detectCorpusPoisoning(claims: readonly Claim[], opts: { threshold?: number } = {}): PoisonFlag[] {
  const threshold = Math.max(1, opts.threshold ?? 10);
  const all = new Map<string, Set<string>>();
  const cheap = new Map<string, Set<string>>();
  for (const c of claims) {
    add(all, c.attribution.identityId, c.subject.value);
    if (!c.signature) add(cheap, c.attribution.identityId, c.subject.value);
  }
  const flags: PoisonFlag[] = [];
  for (const [actorId, cheapSubjects] of cheap) {
    if (cheapSubjects.size >= threshold) {
      flags.push({
        actorId,
        subjectCount: all.get(actorId)?.size ?? cheapSubjects.size,
        cheapSubjectCount: cheapSubjects.size,
        reason: `asserts authorship over ${cheapSubjects.size} distinct subjects with unsigned (asserted-tier) claims`,
      });
    }
  }
  return flags.sort((a, b) => b.cheapSubjectCount - a.cheapSubjectCount);
}
