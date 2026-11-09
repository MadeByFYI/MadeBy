// The authorship-coverage scoreboard — a COMPUTED, labeled estimate (invariants #4/#6). It measures
// DISCLOSURE, never detection: a commit is "known" only when an authorship disclosure is on the record;
// an undisclosed commit is UNKNOWN (never defaulted to human). Of the known, it reports the
// human/with_ai/ai mix and the asserted-vs-verified trust split. Percentages are derived at the edge
// (the renderer), never stored — the report carries only counts.

import { commitDisclosureKinds } from "@madeby/core";
import { classifyCommit } from "@madeby/classify";
import { readScoredCommits, supportsRemergeDiff } from "./git";
import { applyLateDisclosures, rangeHead, readDisclosureCommits } from "./late-disclosure";

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
  /** of the known, those disclosed afterwards by a disclosure commit (`Discloses:`), not in their own message */
  readonly late: number;
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
  /**
   * The same picture per commit author, most commits first: who discloses and who doesn't. Keyed by
   * the author email git records, read through the repo's .mailmap (an identity is never guessed —
   * only the project's own mapping merges two), named by its most recent name.
   */
  readonly byAuthor: ReadonlyArray<AuthorCount>;
}

export interface AuthorCount {
  /** the git author name on the author's most recent commit in scope */
  readonly name: string;
  /** the git author email (through .mailmap), lowercased — the grouping key */
  readonly email: string;
  /** the raw `Name <email>` identities .mailmap folded into this author (empty when none differ) */
  readonly aliases: ReadonlyArray<string>;
  /** commits scored */
  readonly commits: number;
  /** of those, commits with an authorship disclosure on the record */
  readonly known: number;
  /** counts over the author's KNOWN commits */
  readonly byCategory: Readonly<Record<CoverageCategory, number>>;
}

export interface AgentCount {
  /**
   * the disclosed name, normalized: e.g. "Claude Opus 5", "Claude Code", "Cursor" — or, for a
   * `tool:model` disclosure, the pairing "Cursor · claude-sonnet-5" (so the same model under two
   * agents stays two rows)
   */
  readonly name: string;
  /** set for a `tool:model` disclosure: the agent or tool */
  readonly tool?: string;
  /** set for a `tool:model` disclosure: the model version, exactly as disclosed */
  readonly model?: string;
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
  // Merges that author content of their own (conflict resolutions) are scored too, over the same span.
  const { authored, merges } = readScoredCommits(root, { range: opts.range, limit: opts.limit ?? 500 });
  // Disclosure commits fill in commits disclosed afterwards; they aren't authored work themselves.
  const commits = applyLateDisclosures([...authored, ...merges], readDisclosureCommits(root, rangeHead(opts.range)));
  const byCategory: Record<CoverageCategory, number> = { human: 0, with_ai: 0, ai: 0, bot: 0 };
  const byTier = { asserted: 0, verified: 0 };
  let known = 0;
  let late = 0;
  const agents = new Map<string, { name: string; provider: string; tool?: string; model?: string; commits: number }>();
  const authors = new Map<string, { name: string; email: string; aliases: Set<string>; commits: number; known: number; byCategory: Record<CoverageCategory, number> }>();

  for (const c of commits) {
    const kinds = commitDisclosureKinds({ message: c.message, signed: c.signed });
    const { class: cls, aiContributors } = classifyCommit({ message: c.message, authorName: c.authorName, authorEmail: c.authorEmail, signed: c.signed, sha: c.sha });
    // classifyCommit defaults to "human" when it finds no AI signal — but *no authorship disclosure*
    // means UNKNOWN, not human (disclosure, not detection). Only count "human" when a human-authorship
    // attestation is actually on the record. A DCO sign-off or bare signature discloses accountability,
    // not the human-vs-AI category, so those stay unknown here.
    const category: CoverageCategory | "unknown" =
      cls === "human" && !kinds.includes("human-attestation") ? "unknown" : cls;
    // commits arrive newest first, so the first name seen for an email is its most recent
    const email = (c.authorEmail ?? "").toLowerCase();
    const author = authors.get(email) ?? { name: c.authorName ?? email, email, aliases: new Set<string>(), commits: 0, known: 0, byCategory: { human: 0, with_ai: 0, ai: 0, bot: 0 } };
    if (c.rawAuthor && c.rawAuthor !== `${c.authorName} <${c.authorEmail}>`) author.aliases.add(c.rawAuthor);
    author.commits += 1;
    authors.set(email, author);
    if (category === "unknown") continue;
    author.known += 1;
    author.byCategory[category] += 1;
    known += 1;
    if (c.late) late += 1;
    byCategory[category] += 1;
    if (c.signed) byTier.verified += 1;
    else byTier.asserted += 1;
    if (category === "with_ai" || category === "ai") {
      const named = new Set<string>();
      for (const a of aiContributors) {
        const paired = a.tool && a.modelVersion ? { tool: a.tool, model: a.modelVersion } : undefined;
        const name = paired ? `${paired.tool} · ${paired.model}` : agentName(a.raw);
        const key = name.toLowerCase();
        if (named.has(key)) continue; // one count per commit per name
        named.add(key);
        const e = agents.get(key) ?? { name, provider: a.provider, ...paired, commits: 0 };
        e.commits += 1;
        agents.set(key, e);
      }
    }
  }

  return {
    isEstimate: true,
    methodology:
      "commit-level authorship disclosure (estimate); undisclosed = unknown, never inferred; merges scored only when they change content of their own" +
      (supportsRemergeDiff() ? " (beyond git's automatic merge)" : " (approximate: this git predates --remerge-diff, so merges git made cleanly may be counted too)") +
      "; a disclosure commit (Discloses:) fills in commits disclosed afterwards and isn't scored itself",
    scope:
      (opts.range ? `range ${opts.range}` : `last ${authored.length} commits`) +
      (merges.length ? ` + ${merges.length} merges with changes of their own${supportsRemergeDiff() ? "" : " (approximate — git < 2.36)"}` : ""),
    total: commits.length,
    known,
    unknown: commits.length - known,
    late,
    byCategory,
    byTier,
    byAgent: [...agents.values()].sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name)),
    byAuthor: [...authors.values()].map((a) => ({ ...a, aliases: [...a.aliases].sort() })).sort((a, b) => b.commits - a.commits || a.email.localeCompare(b.email)),
  };
}
