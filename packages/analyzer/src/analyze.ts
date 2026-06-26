// The curiosity mirror's engine: git history → classify → a human/AI breakdown.
// The breakdown is a COMPUTED, labeled estimate (invariants #4/#6) — percentages are derived
// here, never stored. Commit-level only in v0; span-level rides ingestion (#10) / dogfood (#2).

import {
  classifyCommit,
  summarize,
  type CommitMeta,
  type ClassificationSummary,
  type AuthorClass,
} from "@madeby/classify";

export interface AnalysisResult {
  readonly isEstimate: true;
  readonly totalCommits: number;
  readonly classification: ClassificationSummary;
  /** percent of commits per class (a view, not stored) */
  readonly percent: Readonly<Record<AuthorClass, number>>;
  /** commits with any AI involvement (ai + with_ai) */
  readonly aiInvolvedPercent: number;
  readonly meanConfidence: number;
  /** distinct AI providers seen, by number of commits */
  readonly topProviders: { provider: string; count: number }[];
}

export function analyzeCommits(commits: readonly CommitMeta[]): AnalysisResult {
  const classifications = commits.map(classifyCommit);
  const summary: ClassificationSummary = summarize(classifications);
  const total = summary.total;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  const providerCounts = new Map<string, number>();
  for (const c of classifications) {
    // count each provider at most once per commit
    const seen = new Set(c.aiContributors.map((a) => a.provider));
    for (const provider of seen) providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1);
  }

  const percent = {
    human: pct(summary.byClass.human),
    ai: pct(summary.byClass.ai),
    with_ai: pct(summary.byClass.with_ai),
  };

  return {
    isEstimate: true,
    totalCommits: total,
    classification: summary,
    percent,
    aiInvolvedPercent: percent.ai + percent.with_ai,
    meanConfidence: summary.meanConfidence,
    topProviders: [...providerCounts.entries()]
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count),
  };
}
