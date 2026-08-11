// Commit-level human/AI classification — the PROBABILISTIC regime (TESTING.md §1/§5).
// This is an estimate, evaluated by benchmark + calibration (#20), NOT conformance vectors.
// v0 signal: `Co-Authored-By:` trailers + commit author. Span-level + session-log evidence
// (higher tier) lands with ingestion (#10) and the dogfood Phase 0 (#2).

// human = a person; ai/with_ai = disclosed AI (LLM) involvement; bot = a machine/automation
// committer (codegen, dependency bots, CI) — machine-authored but NOT necessarily AI. Kept distinct
// so we count machine authorship from a DISCLOSED signal (the committer identity) without inferring.
export type AuthorClass = "human" | "ai" | "with_ai" | "bot";

export interface CommitMeta {
  message: string;
  authorName?: string;
  authorEmail?: string;
  /** commit SHA (used by the mirror to join per-commit provenance signals; classify ignores it) */
  sha?: string;
  /** a cryptographic signature is present on the commit (presence only, not validity) */
  signed?: boolean;
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
// EVIDENCE-GRADE only (#78): named AI tools / agent identities, chosen to avoid colliding with
// human names (e.g. we match `\bcursor(agent)?\b`, never bare "cody"). No behavioral inference.
const AI_PATTERNS: AiPattern[] = [
  { re: /claude/i, provider: "anthropic", model: "claude" },
  { re: /copilot/i, provider: "github-copilot" },
  { re: /\bcursor(?:agent)?\b/i, provider: "cursor" },
  { re: /\bdevin\b/i, provider: "cognition" },
  { re: /gemini/i, provider: "google" },
  { re: /chatgpt|openai|codex|\bgpt-/i, provider: "openai" },
  { re: /codeium|windsurf/i, provider: "codeium" },
  { re: /\baider\b/i, provider: "aider" },
  { re: /codewhisperer/i, provider: "amazon" },
  { re: /tabnine/i, provider: "tabnine" },
];

function matchAi(text: string): AiContributor | null {
  for (const p of AI_PATTERNS) {
    if (p.re.test(text)) return { provider: p.provider, ...(p.model ? { model: p.model } : {}), raw: text.trim() };
  }
  return null;
}

// Recognize the AI-attribution trailers tools actually emit, not just Co-authored-by (#78).
// matchAi still gates AI vs. human per entry, so widening the keys never causes a false positive.
const TRAILER_RE = /^[ \t]*(?:Co-authored-by|Generated-by|Assisted-by):[ \t]*(.+)$/gim;

// Confidence model (honest about uncertainty):
//  - an explicit AI trailer/author is STRONG evidence of AI involvement → high confidence
//  - "human" rests on the ABSENCE of an AI signal — weak evidence → deliberately lower
const CONF_WITH_AI = 0.9;
const CONF_AI = 0.85;
const CONF_HUMAN = 0.55;
const CONF_BOT = 0.95; // a bot identity is a strong, near-deterministic disclosed signal

// Recognize machine/automation committers from their identity — DISCLOSED, not inferred. The
// GitHub App `[bot]` suffix is official and near-zero human collision; the named set is evidence-
// grade (specific automation identities, not a generic "bot" substring that could hit a human name).
const KNOWN_BOTS =
  /\b(?:dependabot|renovate(?:-bot)?|greenkeeper|snyk-bot|github-actions|semantic-release-bot|stainless-app|allcontributors|mergify|codecov-commenter|pre-commit-ci|imgbot|whitesource-bot|copybara)\b/i;

/** Is this committer a machine/automation identity? (the `[bot]` suffix or a known automation name) */
export function isBotIdentity(name?: string, email?: string): boolean {
  const n = (name ?? "").trim();
  const e = (email ?? "").trim();
  if (/\[bot\]$/i.test(n) || /\[bot\]@/i.test(e)) return true; // GitHub App bots
  if (e === "actions@github.com") return true; // GitHub Actions
  return KNOWN_BOTS.test(n) || KNOWN_BOTS.test(e);
}

export function classifyCommit(commit: CommitMeta): CommitClassification {
  const signals: string[] = [];
  const aiContributors: AiContributor[] = [];

  // A machine/automation committer is machine-authored by disclosure of its own identity — decided
  // first, before the human/AI logic. (Precedence: the committer *is* the bot; AI-of-the-content is
  // a separate question we don't infer here.)
  if (isBotIdentity(commit.authorName, commit.authorEmail)) {
    return { class: "bot", confidence: CONF_BOT, signals: ["author:bot"], aiContributors };
  }

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
