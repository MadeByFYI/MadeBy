// The authorship-coverage scoreboard — a COMPUTED, labeled estimate (invariants #4/#6). It measures
// DISCLOSURE, never detection: a commit is "known" only when an authorship disclosure is on the record;
// an undisclosed commit is UNKNOWN (never defaulted to human). Of the known, it reports the
// human/with_ai/ai mix and the asserted-vs-verified trust split. Percentages are derived at the edge
// (the renderer), never stored — the report carries only counts.

import { commitDisclosureKinds } from "@madeby/core";
import { classifyCommit } from "@madeby/classify";
import { commitTime, readAuthoredMerges, readGitLog } from "./git";

export type CoverageCategory = "human" | "with_ai" | "ai" | "bot";

export interface CoverageReport {
  /** always true — a coverage figure is an estimate, never asserted as truth */
  readonly isEstimate: true;
  readonly methodology: string;
  /** what was scored, e.g. "last 500 commits" or a range */
  readonly scope: string;
  /** commits scored */
  readonly total: number;
  /** commits with an authorship disclosure on the record */
  readonly known: number;
  /** commits with no authorship disclosure — origin unknown, never guessed */
  readonly unknown: number;
  /** counts over the KNOWN commits (not the whole repo) */
  readonly byCategory: Readonly<Record<CoverageCategory, number>>;
  /** trust split over the KNOWN commits: asserted (self-reported) vs verified (signed) */
  readonly byTier: Readonly<{ asserted: number; verified: number }>;
  /**
   * The agents and model versions named in the AI-involved commits (with_ai + ai), most-used first —
   * exactly as disclosed, never inferred. A commit naming a tool and its model (`Assisted-by: Claude
   * Code` + `Co-Authored-By: Claude Opus 5`) counts under each, so the counts can sum past the total.
   */
  readonly byAgent: ReadonlyArray<AgentCount>;
}

export interface AgentCount {
  /** the disclosed name, normalized: e.g. "Claude Opus 5", "Claude Code", "Cursor" */
  readonly name: string;
  /** the vendor family it belongs to (open field), e.g. "anthropic", "cursor", "unspecified" */
  readonly provider: string;
  /** AI-involved commits naming it */
  readonly commits: number;
}

/**
 * The display name of a disclosed AI contributor: the trailer value minus its email and any trailing
 * parenthetical (a context-window or plan note such as "(1M context)", not a different model), so
 * `Claude Opus 5 (1M context) <noreply@anthropic.com>` and `Claude Opus 5` group together. The version
 * is whatever the disclosure says — there is no model list to match against.
 */
export function agentName(raw: string): string {
  const name = raw
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter((w) => !w.includes("@"))
    .join(" ")
    .replace(/(\s*\([^)]*\))+\s*$/, "")
    .trim();
  return name || raw.trim();
}

/**
 * Compute the authorship-coverage scoreboard over a repo's recent commits (or a range). Reads git +
 * the disclosure vocabulary; never throws (degrades to an empty report). Honest by construction:
 * undisclosed commits are `unknown`, never inferred as human.
 */
export function repoCoverage(root: string, opts: { range?: string; limit?: number } = {}): CoverageReport {
  const limit = opts.range ? undefined : opts.limit ?? 500;
  const authored = readGitLog(root, limit, opts.range);
  // Merges that author content of their own (conflict resolutions) are scored too, over the same span
  // of history: the range, or back to the oldest commit in the window (all history if it isn't full).
  const oldest = authored.at(-1)?.sha;
  const since = limit && oldest && authored.length >= limit ? commitTime(root, oldest) : undefined;
  const merges = authored.length > 0 && (!limit || authored.length < limit || since !== undefined) ? readAuthoredMerges(root, { range: opts.range, since }) : [];
  const commits = [...authored, ...merges];
  const byCategory: Record<CoverageCategory, number> = { human: 0, with_ai: 0, ai: 0, bot: 0 };
  const byTier = { asserted: 0, verified: 0 };
  let known = 0;
  const agents = new Map<string, { name: string; provider: string; commits: number }>();

  for (const c of commits) {
    const kinds = commitDisclosureKinds({ message: c.message, signed: c.signed });
    const { class: cls, aiContributors } = classifyCommit({ message: c.message, authorName: c.authorName, authorEmail: c.authorEmail, signed: c.signed, sha: c.sha });
    // classifyCommit defaults to "human" when it finds no AI signal — but *no authorship disclosure*
    // means UNKNOWN, not human (disclosure, not detection). Only count "human" when a human-authorship
    // attestation is actually on the record. A DCO sign-off or bare signature discloses accountability,
    // not the human-vs-AI category, so those stay unknown here.
    const category: CoverageCategory | "unknown" =
      cls === "human" && !kinds.includes("human-attestation") ? "unknown" : cls;
    if (category === "unknown") continue;
    known += 1;
    byCategory[category] += 1;
    if (c.signed) byTier.verified += 1;
    else byTier.asserted += 1;
    if (category === "with_ai" || category === "ai") {
      const named = new Set<string>();
      for (const a of aiContributors) {
        const name = agentName(a.raw);
        const key = name.toLowerCase();
        if (named.has(key)) continue; // one count per commit per name
        named.add(key);
        const e = agents.get(key) ?? { name, provider: a.provider, commits: 0 };
        e.commits += 1;
        agents.set(key, e);
      }
    }
  }

  return {
    isEstimate: true,
    methodology: "commit-level authorship disclosure (estimate); undisclosed = unknown, never inferred; merges scored only when they change content of their own",
    scope: (opts.range ? `range ${opts.range}` : `last ${authored.length} commits`) + (merges.length ? ` + ${merges.length} merges with changes of their own` : ""),
    total: commits.length,
    known,
    unknown: commits.length - known,
    byCategory,
    byTier,
    byAgent: [...agents.values()].sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name)),
  };
}
