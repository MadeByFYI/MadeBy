// The curiosity mirror's engine: git history → classify → an answer to "WHO made this".
//
// Mission guardrail: we NAME the creators and put the uncertainty in the TIER — we never
// abdicate the question with "no signal found". Every commit has an author (a human operator)
// and possibly AI co-authors; the answer is that set of contributors. The human/AI split is a
// derived *facet*, not the answer. The breakdown is a labeled estimate (invariants #4/#6).
// Commit-level in v0; span-level rides ingestion (#10) / dogfood (#2).

import {
  classifyCommit,
  summarize,
  type CommitMeta,
  type ClassificationSummary,
  type AuthorClass,
} from "@madeby/classify";
import { hasDcoSignoff } from "@madeby/core";
import { resolveIdentity } from "./identity";

export type ContributorKind = "human" | "ai" | "bot";

/** On-demand GitHub-API enrichment of a resolved handle (enrich.ts) — real name + reach. */
export interface IdentityProfile {
  handle: string;
  name?: string;
  company?: string;
  followers?: number;
  topRepos: { name: string; stars: number }[];
  /** one-line reach summary, e.g. "81k followers · awesome (495k★)" */
  reach?: string;
}

export interface Contributor {
  kind: ContributorKind;
  /** display name: the author's name (human/bot) or the AI provider (ai) */
  name: string;
  /** email (human/bot) or model (ai), when known */
  detail?: string;
  /** the committer's public GitHub handle, when they linked it via a noreply email (identity.ts) */
  handle?: string;
  /** on-demand GitHub-API enrichment (real name + reach), when available (enrich.ts) */
  profile?: IdentityProfile;
  /** number of commits this contributor appears in */
  commits: number;
}

export interface AnalysisResult {
  readonly isEstimate: true;
  /** git-derived and unverified — the uncertainty lives here, not in the answer */
  readonly tier: "asserted";
  readonly totalCommits: number;
  /** THE answer to "who made this": human operators/authors + AI models, by commit count */
  readonly contributors: Contributor[];
  /** facet: per-class commit % */
  readonly percent: Readonly<Record<AuthorClass, number>>;
  /** facet: commits with any AI involvement (ai + with_ai) */
  readonly aiInvolvedPercent: number;
  /** facet: commits authored by a machine/automation committer (bots) — DISCLOSED, not inferred */
  readonly botAuthoredPercent: number;
  /** facet: commits with NO author info AND no AI signal — genuinely unattributed (usually ~0 in
   *  git, where commits carry an author). Distinct from human-attributed-but-AI-unknown. */
  readonly unattributedPercent: number;
  readonly meanConfidence: number;
  /**
   * Disclosure Score: the share of commits that DISCLOSE their origin with a
   * verifiable per-commit signal — an AI-authorship trailer or a commit signature. This is correct
   * by construction at zero network (we count signals we can see; we never infer an AI ratio). The
   * remainder is `undisclosedPercent` — origin not declared/verifiable — NEVER relabeled "human".
   */
  readonly disclosedPercent: number;
  readonly disclosedByTrailerPercent: number;
  readonly disclosedBySignaturePercent: number;
  readonly disclosedByDcoPercent: number;
  readonly undisclosedPercent: number;
  readonly caveat: string;
}

const CAVEAT =
  "git-derived and unverified (asserted tier); absence of an AI signal is not proof of human authorship.";

export function analyzeCommits(commits: readonly CommitMeta[]): AnalysisResult {
  const classifications = commits.map(classifyCommit);
  const summary: ClassificationSummary = summarize(classifications);
  const total = summary.total;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  const humans = new Map<string, Contributor>();
  const ais = new Map<string, Contributor>();
  const bots = new Map<string, Contributor>(); // machine/automation committers (a disclosed kind)
  let unattributed = 0; // no author info AND no AI signal → genuinely unknown
  let disclosedByTrailer = 0; // commit discloses AI via a trailer/author signal
  let disclosedBySignature = 0; // commit carries a signature (presence)
  let disclosedByDco = 0; // commit carries a DCO Signed-off-by (certified origin)
  let disclosed = 0; // discloses origin via ANY per-commit signal (the Disclosure Score numerator)

  commits.forEach((commit, i) => {
    const c = classifications[i]!;
    const isBot = c.class === "bot";
    const authorIsAi = c.signals.some((s) => s.startsWith("author:") && s !== "author:bot");
    if (c.class === "human" && !commit.authorName && !commit.authorEmail) unattributed += 1;

    // Disclosure: what origin signal did this commit actually carry (never inferred)? Recognizes
    // BOTH MadeBy-native and external existing signals — an AI trailer, a commit signature, or a
    // DCO sign-off (the huge OSS DCO population already discloses origin this way).
    const byTrailer = c.aiContributors.length > 0;
    const bySignature = commit.signed === true;
    const byDco = hasDcoSignoff(commit.message);
    // A bot committer inherently DISCLOSES a machine origin (a named automation identity), so it
    // counts as disclosed — a 76%-bot repo isn't "undisclosed," we know a machine made it.
    if (byTrailer) disclosedByTrailer += 1;
    if (bySignature) disclosedBySignature += 1;
    if (byDco) disclosedByDco += 1;
    if (byTrailer || bySignature || byDco || isBot) disclosed += 1;

    // Who made it — three distinct, always-named kinds (never abdicate, never lump a bot into human):
    if (isBot) {
      const key = commit.authorEmail || commit.authorName || "bot";
      const cur =
        bots.get(key) ??
        ({ kind: "bot", name: commit.authorName || commit.authorEmail || "bot", detail: commit.authorEmail, commits: 0 } as Contributor);
      bots.set(key, { ...cur, commits: cur.commits + 1 });
    } else if (!authorIsAi && (commit.authorName || commit.authorEmail)) {
      // Resolve to a stable identity — merges a person's commits across their noreply-email variants
      // and attaches their public GitHub handle where they linked it (identity.ts).
      const id = resolveIdentity(commit.authorName, commit.authorEmail);
      const cur =
        humans.get(id.key) ??
        ({
          kind: "human",
          name: commit.authorName || commit.authorEmail!,
          detail: commit.authorEmail,
          ...(id.handle ? { handle: id.handle } : {}),
          commits: 0,
        } as Contributor);
      humans.set(id.key, { ...cur, commits: cur.commits + 1 });
    }

    // AI contributors (distinct per commit); bot commits carry none.
    const seen = new Set<string>();
    for (const ai of c.aiContributors) {
      if (seen.has(ai.provider)) continue;
      seen.add(ai.provider);
      const cur =
        ais.get(ai.provider) ?? ({ kind: "ai", name: ai.provider, detail: ai.model, commits: 0 } as Contributor);
      ais.set(ai.provider, { ...cur, commits: cur.commits + 1 });
    }
  });

  const contributors = [...humans.values(), ...ais.values(), ...bots.values()].sort((a, b) => b.commits - a.commits);

  const percent = {
    human: pct(summary.byClass.human),
    ai: pct(summary.byClass.ai),
    with_ai: pct(summary.byClass.with_ai),
    bot: pct(summary.byClass.bot),
  };

  return {
    isEstimate: true,
    tier: "asserted",
    totalCommits: total,
    contributors,
    percent,
    aiInvolvedPercent: percent.ai + percent.with_ai,
    botAuthoredPercent: percent.bot,
    unattributedPercent: pct(unattributed),
    meanConfidence: summary.meanConfidence,
    disclosedPercent: pct(disclosed),
    disclosedByTrailerPercent: pct(disclosedByTrailer),
    disclosedBySignaturePercent: pct(disclosedBySignature),
    disclosedByDcoPercent: pct(disclosedByDco),
    undisclosedPercent: pct(total - disclosed),
    caveat: CAVEAT,
  };
}
