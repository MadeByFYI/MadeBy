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

export type ContributorKind = "human" | "ai";

export interface Contributor {
  kind: ContributorKind;
  /** display name: the author's name (human) or the AI provider (ai) */
  name: string;
  /** email (human) or model (ai), when known */
  detail?: string;
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
  readonly meanConfidence: number;
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

  commits.forEach((commit, i) => {
    const c = classifications[i]!;
    const authorIsAi = c.signals.some((s) => s.startsWith("author:"));

    // The human author/operator answers "who" — unless the commit's author is itself an AI.
    if (!authorIsAi && (commit.authorName || commit.authorEmail)) {
      const key = commit.authorEmail || commit.authorName!;
      const cur =
        humans.get(key) ??
        ({ kind: "human", name: commit.authorName || commit.authorEmail!, detail: commit.authorEmail, commits: 0 } as Contributor);
      humans.set(key, { ...cur, commits: cur.commits + 1 });
    }

    // AI contributors (distinct per commit).
    const seen = new Set<string>();
    for (const ai of c.aiContributors) {
      if (seen.has(ai.provider)) continue;
      seen.add(ai.provider);
      const cur =
        ais.get(ai.provider) ?? ({ kind: "ai", name: ai.provider, detail: ai.model, commits: 0 } as Contributor);
      ais.set(ai.provider, { ...cur, commits: cur.commits + 1 });
    }
  });

  const contributors = [...humans.values(), ...ais.values()].sort((a, b) => b.commits - a.commits);

  const percent = {
    human: pct(summary.byClass.human),
    ai: pct(summary.byClass.ai),
    with_ai: pct(summary.byClass.with_ai),
  };

  return {
    isEstimate: true,
    tier: "asserted",
    totalCommits: total,
    contributors,
    percent,
    aiInvolvedPercent: percent.ai + percent.with_ai,
    meanConfidence: summary.meanConfidence,
    caveat: CAVEAT,
  };
}
