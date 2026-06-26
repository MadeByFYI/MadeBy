// Commit-level human/AI classification — the PROBABILISTIC regime (TESTING.md §1/§5).
// This is an estimate, evaluated by benchmark + calibration (#20), NOT conformance vectors.
// v0 signal: `Co-Authored-By:` trailers + commit author. Span-level + session-log evidence
// (higher tier) lands with ingestion (#10) and the dogfood Phase 0 (#2).

export type AuthorClass = "human" | "ai" | "with_ai";

export interface CommitMeta {
  message: string;
  authorName?: string;
  authorEmail?: string;
}

export interface AiContributor {
  /** open field — never a hardcoded model enum */
  provider: string;
  model?: string;
  /** the raw matched text (trailer or author) */
  raw: string;
}

export interface CommitClassification {
  class: AuthorClass;
  /** 0..1 — ALWAYS surfaced; a bare class is never returned (TESTING.md §5) */
  confidence: number;
  /** evidence used, e.g. ["co-authored-by:anthropic"] */
  signals: string[];
  aiContributors: AiContributor[];
}

interface AiPattern {
  re: RegExp;
  provider: string;
  model?: string;
}

// Known AI co-author / author signatures. Open-ended — extended over time; unknown AI tools
// simply read as human until added (a false-negative, which is the safe direction here).
const AI_PATTERNS: AiPattern[] = [
  { re: /claude/i, provider: "anthropic", model: "claude" },
  { re: /copilot/i, provider: "github-copilot" },
  { re: /\bcursor\b/i, provider: "cursor" },
  { re: /\bdevin\b/i, provider: "cognition" },
  { re: /gemini/i, provider: "google" },
  { re: /chatgpt|openai|codex|\bgpt-/i, provider: "openai" },
];

function matchAi(text: string): AiContributor | null {
  for (const p of AI_PATTERNS) {
    if (p.re.test(text)) return { provider: p.provider, ...(p.model ? { model: p.model } : {}), raw: text.trim() };
  }
  return null;
}

const TRAILER_RE = /^[ \t]*Co-authored-by:[ \t]*(.+)$/gim;

// Confidence model (honest about uncertainty):
//  - an explicit AI trailer/author is STRONG evidence of AI involvement → high confidence
//  - "human" rests on the ABSENCE of an AI signal — weak evidence → deliberately lower
const CONF_WITH_AI = 0.9;
const CONF_AI = 0.85;
const CONF_HUMAN = 0.55;

export function classifyCommit(commit: CommitMeta): CommitClassification {
  const signals: string[] = [];
  const aiContributors: AiContributor[] = [];

  const trailers = [...commit.message.matchAll(TRAILER_RE)].map((m) => m[1]!.trim());
  let humanCoAuthors = 0;
  for (const who of trailers) {
    const ai = matchAi(who);
    if (ai) {
      aiContributors.push(ai);
      signals.push(`co-authored-by:${ai.provider}`);
    } else {
      humanCoAuthors += 1;
    }
  }

  const authorText = `${commit.authorName ?? ""} ${commit.authorEmail ?? ""}`.trim();
  const authorAi = authorText ? matchAi(authorText) : null;
  if (authorAi) {
    aiContributors.push({ ...authorAi, raw: authorText });
    signals.push(`author:${authorAi.provider}`);
  }

  const hasAi = aiContributors.length > 0;
  const humanPresent = authorAi === null /* author treated as human */ || humanCoAuthors > 0;

  if (!hasAi) {
    return { class: "human", confidence: CONF_HUMAN, signals, aiContributors };
  }
  if (authorAi !== null && !humanPresent) {
    return { class: "ai", confidence: CONF_AI, signals, aiContributors };
  }
  return { class: "with_ai", confidence: CONF_WITH_AI, signals, aiContributors };
}
