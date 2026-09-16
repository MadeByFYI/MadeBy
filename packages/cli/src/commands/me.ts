// `madeby me` — made by me: affirm you authored HEAD yourself, by adding an `Authored-by-human`
// trailer to the commit message. The symmetric human claim to `madeby ai`, and it climbs the SAME
// ladder — asserted testimony now, verified when the commit is signed. Honest by construction: you're
// putting your own name to your own work. It amends HEAD only (a testimony, never a content change),
// and refuses to fold in staged work.
//
// `madeby me --with-ai [tool]` — made by me, WITH AI: the assisted middle state (the wild's third
// category). Adds an `Assisted-by: <tool>` disclosure alongside the human affirmation, so the commit
// classifies as `with_ai` (badge `hi + ai`) — a human is accountable AND the AI is disclosed, in one
// action instead of the implicit `ai`+`me` pair. `<tool>` defaults to a generic "AI" if unnamed.
//
// The disclosure mechanic is the pure `affirmAuthorship()` below — shared with the MCP `disclose` tool,
// so a human at the CLI and an agent over MCP disclose collaborative (with_ai / human) work identically.

import { execFileSync } from "node:child_process";
import { repoRoot } from "../scope";

/** Parse `--with-ai`, `--with-ai <tool>`, or `--with-ai=<tool>`; returns the tool or null if unset. */
function parseWithAi(args: string[]): { withAi: boolean; tool: string } {
  const i = args.findIndex((a) => a === "--with-ai" || a.startsWith("--with-ai="));
  if (i === -1) return { withAi: false, tool: "AI" };
  const a = args[i]!;
  if (a.startsWith("--with-ai=")) return { withAi: true, tool: a.slice("--with-ai=".length).trim() || "AI" };
  const next = args[i + 1];
  return { withAi: true, tool: next && !next.startsWith("-") ? next : "AI" };
}

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

// Matches the affirmative human-authorship trailer (kept in sync with core's HUMAN_ATTEST_RE).
const HUMAN_ATTEST = /^[ \t]*(?:Authored-by-human|Human-authored(?:-by)?)[ \t]*:/im;
const ASSIST = /^[ \t]*Assisted-by[ \t]*:/im;

export interface AffirmResult {
  /** false ⇒ couldn't affirm (see `reason`); true ⇒ HEAD now discloses per ACO */
  ok: boolean;
  reason?: "no-identity" | "staged-changes" | "no-commit";
  /** did we amend HEAD's message? (false ⇒ it already disclosed — nothing to do) */
  changed: boolean;
  withAi: boolean;
  tool: string;
  name?: string;
  email?: string;
  subject?: string;
  /** trailers added this call: "Authored-by-human" / "Assisted-by" / "Authored-by-ai" */
  added: string[];
  /** what HEAD discloses after this call */
  category: "human" | "with_ai" | "ai";
}

// The AI-authorship trailer — the symmetric counterpart of `Authored-by-human`. It states an AI
// authored the change while the committer (the git author) remains the accountable human. Asserted
// tier, no session log — the honest, log-free `ai` disclosure. Kept in sync with core's recognizer.
const AI_AUTHOR = /^[ \t]*Authored-by-ai[ \t]*:/im;

/**
 * Attest AI authorship on HEAD per ACO: add an `Authored-by-ai: <tool>` trailer so the commit
 * classifies `ai`. Same mechanics as {@link affirmAuthorship} but no git identity is read — the git
 * author/committer is the accountable party, recorded by git itself. Amends HEAD's MESSAGE only,
 * refuses staged changes, idempotent.
 */
export function attestAiAuthorship(root: string, opts: { tool?: string } = {}): AffirmResult {
  const tool = (opts.tool && opts.tool.trim()) || "AI";
  const base: AffirmResult = { ok: false, changed: false, withAi: false, tool, added: [], category: "ai" };

  try {
    execFileSync("git", ["-C", root, "diff", "--cached", "--quiet"]);
  } catch {
    return { ...base, reason: "staged-changes" };
  }

  let subject = "";
  let message = "";
  try {
    subject = git(root, ["show", "-s", "--format=%s", "HEAD"]);
    message = git(root, ["show", "-s", "--format=%B", "HEAD"]);
  } catch {
    return { ...base, reason: "no-commit" };
  }

  const added: string[] = [];
  const trailers: string[] = [];
  if (!AI_AUTHOR.test(message)) {
    trailers.push("--trailer", `Authored-by-ai: ${tool}`);
    added.push("Authored-by-ai");
  }
  if (trailers.length > 0) {
    execFileSync("git", ["-C", root, "commit", "--amend", "--no-edit", ...trailers]);
  }
  return { ok: true, changed: trailers.length > 0, withAi: false, tool, subject, added, category: "ai" };
}

/**
 * Disclose authorship on HEAD per ACO: affirm human authorship (`Authored-by-human`) and, with
 * `withAi`, disclose AI assistance (`Assisted-by: <tool>`) so the commit classifies `with_ai`. Pure of
 * console/exit — returns a result the CLI renders and the MCP `disclose` tool returns. Amends HEAD's
 * MESSAGE only (never content), refuses when the index has staged changes, and is idempotent per trailer.
 */
export function affirmAuthorship(root: string, opts: { withAi?: boolean; tool?: string } = {}): AffirmResult {
  const withAi = opts.withAi ?? false;
  const tool = (opts.tool && opts.tool.trim()) || "AI";
  const base: AffirmResult = { ok: false, changed: false, withAi, tool, added: [], category: withAi ? "with_ai" : "human" };

  let name = "";
  let email = "";
  try {
    name = git(root, ["config", "user.name"]);
    email = git(root, ["config", "user.email"]);
  } catch {
    /* fall through to the identity check */
  }
  if (!name || !email) return { ...base, reason: "no-identity" };

  // `me` affirms the last commit — it does not amend content. Refuse to silently fold in staged work.
  try {
    execFileSync("git", ["-C", root, "diff", "--cached", "--quiet"]);
  } catch {
    return { ...base, reason: "staged-changes", name, email };
  }

  let subject = "";
  let message = "";
  try {
    subject = git(root, ["show", "-s", "--format=%s", "HEAD"]);
    message = git(root, ["show", "-s", "--format=%B", "HEAD"]);
  } catch {
    return { ...base, reason: "no-commit" };
  }

  const hasHuman = HUMAN_ATTEST.test(message);
  const hasAssist = ASSIST.test(message);

  const trailers: string[] = [];
  const added: string[] = [];
  if (!hasHuman) {
    trailers.push("--trailer", `Authored-by-human: ${name} <${email}>`);
    added.push("Authored-by-human");
  }
  if (withAi && !hasAssist) {
    trailers.push("--trailer", `Assisted-by: ${tool}`);
    added.push("Assisted-by");
  }

  if (trailers.length > 0) {
    execFileSync("git", ["-C", root, "commit", "--amend", "--no-edit", ...trailers]);
  }

  const category = hasAssist || added.includes("Assisted-by") ? "with_ai" : "human";
  return { ok: true, changed: trailers.length > 0, withAi, tool, name, email, subject, added, category };
}

export function meCommand(args: string[]): void {
  const { withAi, tool } = parseWithAi(args);
  const root = repoRoot();
  if (!root) {
    console.error("madeby me: not a git repository.");
    process.exit(2);
    return;
  }

  const r = affirmAuthorship(root, { withAi, tool });
  if (!r.ok) {
    if (r.reason === "no-identity") console.error("madeby me: set your git identity first (git config user.name / user.email).");
    else if (r.reason === "staged-changes") console.error("madeby me: you have staged changes. Commit them first — `me` affirms HEAD, not your index.");
    else console.error("madeby me: no commit to affirm — make a commit first.");
    process.exit(1);
    return;
  }

  if (!r.changed) {
    const already = withAi ? "already affirms human authorship and discloses AI assistance" : "already affirms human authorship";
    console.log(`madeby me: HEAD ${already}. Nothing to do.`);
    process.exit(0);
    return;
  }

  console.log(
    withAi
      ? `madeby me: made by me, with AI — affirmed human authorship + disclosed AI assistance on HEAD — "${r.subject}" (Authored-by-human: ${r.name}; Assisted-by: ${r.tool}).`
      : `madeby me: affirmed human authorship on HEAD — "${r.subject}" (Authored-by-human: ${r.name}).`,
  );
}
