// `madeby me` — made by me: affirm you authored HEAD yourself, by adding an `Authored-by-human`
// trailer to the commit message. The symmetric human claim to `madeby ai`, and it climbs the SAME
// ladder — asserted testimony now, verified when the commit is signed. Honest by construction: you're
// putting your own name to your own work. It amends HEAD only (a testimony, never a content change),
// and refuses to fold in staged work.
//
// `madeby me [--with-ai tool] --for <commit|range>` — disclose EARLIER commits without rewriting them:
// one empty disclosure commit naming them (`Discloses: <hash>`), for repos that forbid amend/rebase.
//
// `madeby me --with-ai [tool]` — made by me, WITH AI: the assisted middle state (the wild's third
// category). Adds an `Assisted-by: <tool>` disclosure alongside the human affirmation, so the commit
// classifies as `with_ai` (badge `hi + ai`) — a human is accountable AND the AI is disclosed, in one
// action instead of the implicit `ai`+`me` pair. `<tool>` defaults to a generic "AI" if unnamed.
// `--model <version>` also names the model it ran (`Assisted-by: <tool>:<version>`) — for repos that
// record it (`madeby init --record-model`).
//
// The disclosure mechanic is the pure `affirmAuthorship()` below — shared with the MCP `disclose` tool,
// so a human at the CLI and an agent over MCP disclose collaborative (with_ai / human) work identically.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readAuthoredMerges, readDisclosureCommits, readGitLog } from "@madeby/analyzer";
import { hasAuthorshipDisclosure, parseDisclosurePolicy } from "@madeby/core";
import { detectAgentModel } from "../model-source";
import { repoRoot } from "../scope";

/** Parse `--model <version>` or `--model=<version>`; undefined if unset. */
export function parseModel(args: string[]): string | undefined {
  const i = args.findIndex((a) => a === "--model" || a.startsWith("--model="));
  if (i === -1) return undefined;
  const a = args[i]!;
  const v = a.startsWith("--model=") ? a.slice("--model=".length) : args[i + 1];
  return v && !v.startsWith("-") ? v : undefined;
}

/**
 * The disclosed AI value for a trailer: the tool, or `tool:model` when the model version is given —
 * the two-field form the classifier splits (`Assisted-by: Cursor:claude-sonnet-5`). Each part is one
 * line (a newline would forge another trailer) and the tool carries no colon (it would mis-split).
 */
export function aiValue(tool: string, model?: string): string {
  const line = (s: string): string => s.replace(/\s+/g, " ").trim();
  const t = line(tool.replace(/:/g, " ")) || "AI";
  const m = model ? line(model) : "";
  return m ? `${t}:${m}` : t;
}

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

/** Does this repo ask AI disclosures to name the model (`recordModel` in its policy)? Fail-safe: no. */
function recordsModel(root: string): boolean {
  const p = join(root, ".madeby", "policy.json");
  if (!existsSync(p)) return false;
  try {
    return parseDisclosurePolicy(JSON.parse(readFileSync(p, "utf8"))).recordModel === true;
  } catch {
    return false;
  }
}

/** Where a disclosure's model comes from: the running tool's own record, else what was passed. */
interface AiInput {
  tool?: string;
  model?: string;
  /** for tests: the environment + home the tool's session record is read from */
  env?: Record<string, string | undefined>;
  home?: string;
  cwd?: string;
}

/**
 * Resolve the tool + model to disclose. In a repo that records the model, the TOOL's record of the
 * running session (Cursor's env, Copilot CLI / Claude Code session logs) wins over the agent's own
 * `--model` — an agent routed by "Auto" may not know which model served it, the tool does. Elsewhere
 * an explicit `--model` is used as given, and nothing is read.
 */
function resolveAi(root: string, o: AiInput): { value: string; tool: string; model?: string; modelSource?: string } {
  const tool = (o.tool && o.tool.trim()) || "AI";
  const detected = recordsModel(root) ? detectAgentModel(tool, o.env ?? process.env, o.home ?? homedir(), o.cwd ?? process.cwd()) : null;
  if (detected) return { value: aiValue(detected.tool, detected.model), tool: detected.tool, model: detected.model, modelSource: detected.source };
  const model = o.model?.trim() || undefined;
  return { value: aiValue(tool, model), tool, ...(model ? { model, modelSource: "as given (--model)" } : {}) };
}

export interface AffirmResult {
  /** false ⇒ couldn't affirm (see `reason`); true ⇒ HEAD now discloses per ACO */
  ok: boolean;
  reason?: "no-identity" | "staged-changes" | "no-commit";
  /** did we amend HEAD's message? (false ⇒ it already disclosed — nothing to do) */
  changed: boolean;
  withAi: boolean;
  /** the disclosed AI value: the tool, or `tool:model` */
  tool: string;
  /** the model version disclosed, if any */
  model?: string;
  /** where the model came from — the tool's own record, or "as given (--model)" */
  modelSource?: string;
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
export function attestAiAuthorship(root: string, opts: AiInput = {}): AffirmResult {
  const ai = resolveAi(root, opts);
  const tool = ai.value;
  const base: AffirmResult = { ok: false, changed: false, withAi: false, tool, model: ai.model, modelSource: ai.modelSource, added: [], category: "ai" };

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
    execFileSync("git", ["-C", root, "commit", "--amend", "--no-edit", "--allow-empty", ...trailers]);
  }
  return { ...base, ok: true, changed: trailers.length > 0, subject, added };
}

export interface TrailerResult {
  ok: boolean;
  reason?: "no-identity";
  /** the disclosure trailer lines, ready for a commit message's last paragraph */
  lines: string[];
  model?: string;
  modelSource?: string;
}

/**
 * The disclosure as trailer LINES, without touching git — for agents whose platform makes or rebuilds
 * the commit itself (a cloud coding agent pushing through its own tool), where amending HEAD afterwards
 * is lost. Put them in the message at commit time: `git commit -m "<msg>" -m "$(madeby ai <tool>
 * --print)"`. Same values (and the same model resolution) as the amending path.
 */
export function disclosureTrailers(root: string, opts: AiInput & { category: "human" | "with_ai" | "ai" }): TrailerResult {
  if (opts.category === "ai") {
    const ai = resolveAi(root, opts);
    return { ok: true, lines: [`Authored-by-ai: ${ai.value}`], model: ai.model, modelSource: ai.modelSource };
  }
  let name = "";
  let email = "";
  try {
    name = git(root, ["config", "user.name"]);
    email = git(root, ["config", "user.email"]);
  } catch {
    /* fall through */
  }
  if (!name || !email) return { ok: false, reason: "no-identity", lines: [] };
  const lines = [`Authored-by-human: ${name} <${email}>`];
  if (opts.category === "human") return { ok: true, lines };
  const ai = resolveAi(root, opts);
  return { ok: true, lines: [...lines, `Assisted-by: ${ai.value}`], model: ai.model, modelSource: ai.modelSource };
}

/**
 * Disclose authorship on HEAD per ACO: affirm human authorship (`Authored-by-human`) and, with
 * `withAi`, disclose AI assistance (`Assisted-by: <tool>`) so the commit classifies `with_ai`. Pure of
 * console/exit — returns a result the CLI renders and the MCP `disclose` tool returns. Amends HEAD's
 * MESSAGE only (never content), refuses when the index has staged changes, and is idempotent per trailer.
 */
export function affirmAuthorship(root: string, opts: AiInput & { withAi?: boolean } = {}): AffirmResult {
  const withAi = opts.withAi ?? false;
  const ai = withAi ? resolveAi(root, opts) : undefined;
  const tool = ai?.value ?? "AI";
  const base: AffirmResult = { ok: false, changed: false, withAi, tool, model: ai?.model, modelSource: ai?.modelSource, added: [], category: withAi ? "with_ai" : "human" };

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
    execFileSync("git", ["-C", root, "commit", "--amend", "--no-edit", "--allow-empty", ...trailers]);
  }

  const category = hasAssist || added.includes("Assisted-by") ? "with_ai" : "human";
  return { ...base, ok: true, changed: trailers.length > 0, name, email, subject, added, category };
}

/** Parse `--for <commit|range>` or `--for=<commit|range>`; undefined if unset. */
export function parseFor(args: string[]): string | undefined {
  const i = args.findIndex((a) => a === "--for" || a.startsWith("--for="));
  if (i === -1) return undefined;
  const a = args[i]!;
  const v = a.startsWith("--for=") ? a.slice("--for=".length) : args[i + 1];
  return v && !v.startsWith("-") ? v : undefined;
}

export interface DiscloseForResult {
  ok: boolean;
  reason?: "no-identity" | "staged-changes" | "bad-target";
  /** the disclosure commit made, if any */
  commit?: string;
  /** the commits it discloses */
  disclosed: { sha: string; subject: string }[];
  /** commits in the target left alone, and why */
  skipped: { sha: string; subject: string; reason: "not-yours" | "already-discloses" | "already-disclosed-later" }[];
  /** the disclosure trailer lines it carries */
  lines: string[];
}

/**
 * Disclose EARLIER commits without rewriting them (LATE-DISCLOSURE.md): make one empty disclosure
 * commit on the current branch whose `Discloses:` lines name them and whose ACO trailers say who wrote
 * them. Only the caller's own commits (author email = git config user.email), only ones not yet
 * disclosed, never with staged content. The model is never read from the running session here — the
 * session now isn't the one that wrote those commits — so it is named only when passed (`--model`).
 */
export function discloseFor(root: string, target: string, opts: { category: "human" | "with_ai" | "ai"; tool?: string; model?: string }): DiscloseForResult {
  const none = { disclosed: [], skipped: [], lines: [] };
  let email = "";
  try {
    email = git(root, ["config", "user.email"]).toLowerCase();
  } catch {
    /* fall through */
  }
  if (!email) return { ok: false, reason: "no-identity", ...none };
  try {
    execFileSync("git", ["-C", root, "diff", "--cached", "--quiet"]);
  } catch {
    return { ok: false, reason: "staged-changes", ...none };
  }

  // the commits named: a range's own commits (plus merges with changes of their own), or one commit
  let commits;
  if (target.includes("..")) {
    commits = [...readGitLog(root, undefined, target), ...readAuthoredMerges(root, { range: target })];
  } else {
    try {
      const sha = git(root, ["rev-parse", "--verify", "--quiet", `${target}^{commit}`]);
      commits = readGitLog(root, 1, sha);
      if (commits[0]?.sha !== sha) commits = readAuthoredMerges(root, { range: `${sha}^!` });
    } catch {
      return { ok: false, reason: "bad-target", ...none };
    }
  }
  if (commits.length === 0) return { ok: false, reason: "bad-target", ...none };

  const later = readDisclosureCommits(root);
  const disclosed: DiscloseForResult["disclosed"] = [];
  const skipped: DiscloseForResult["skipped"] = [];
  for (const c of commits) {
    const sha = (c.sha ?? "").toLowerCase();
    const subject = c.message.split("\n")[0] ?? "";
    if (later.disclosureCommits.has(sha)) continue;
    if ((c.authorEmail ?? "").toLowerCase() !== email) skipped.push({ sha, subject, reason: "not-yours" });
    else if (hasAuthorshipDisclosure(c.message)) skipped.push({ sha, subject, reason: "already-discloses" });
    else if (later.applied.has(sha)) skipped.push({ sha, subject, reason: "already-disclosed-later" });
    else disclosed.push({ sha, subject });
  }

  // the same trailers a commit would carry, model only as given (never the current session's)
  const t = disclosureTrailers(root, { category: opts.category, tool: opts.tool, model: opts.model, env: {}, home: "/nonexistent" });
  if (!t.ok) return { ok: false, reason: "no-identity", ...none };
  if (disclosed.length === 0) return { ok: true, disclosed, skipped, lines: t.lines };

  const n = disclosed.length;
  const subject = `Disclose authorship of ${n} earlier commit${n === 1 ? "" : "s"}`;
  const body = [...disclosed.map((d) => `Discloses: ${d.sha}`), ...t.lines].join("\n");
  execFileSync("git", ["-C", root, "commit", "--allow-empty", "-m", subject, "-m", body], { stdio: ["ignore", "ignore", "pipe"] });
  return { ok: true, commit: git(root, ["rev-parse", "HEAD"]), disclosed, skipped, lines: t.lines };
}

/** Print a `--for` result for `me` / `ai`. */
export function renderDiscloseFor(cmd: string, target: string, r: DiscloseForResult): void {
  if (!r.ok) {
    if (r.reason === "no-identity") console.error(`madeby ${cmd}: set your git identity first (git config user.name / user.email).`);
    else if (r.reason === "staged-changes") console.error(`madeby ${cmd}: you have staged changes. A disclosure commit carries no content — commit or unstage them first.`);
    else console.error(`madeby ${cmd}: no commits found for ${target}. Give a commit or a range, e.g. --for origin/dev..HEAD`);
    process.exit(1);
    return;
  }
  const why = { "not-yours": "another author's — they disclose their own", "already-discloses": "its message already discloses", "already-disclosed-later": "a disclosure commit already covers it" };
  for (const s of r.skipped) console.log(`  skipped ${s.sha.slice(0, 8)}  ${s.subject.slice(0, 50)}  (${why[s.reason]})`);
  if (!r.commit) {
    console.log(`madeby ${cmd}: nothing to disclose in ${target}.`);
    return;
  }
  console.log(
    `madeby ${cmd}: made disclosure commit ${r.commit.slice(0, 8)} for ${r.disclosed.length} earlier commit${r.disclosed.length === 1 ? "" : "s"} (${r.lines.join("; ")}).\n` +
      "  Nothing was rewritten. Push it as usual; on a pull request the check re-runs.",
  );
}

export function meCommand(args: string[]): void {
  const { withAi, tool } = parseWithAi(args);
  const model = parseModel(args);
  if (model && !withAi) {
    console.error("madeby me: --model names the AI's model, so it goes with --with-ai (e.g. madeby me --with-ai Cursor --model claude-sonnet-5).");
    process.exit(1);
    return;
  }
  const root = repoRoot();
  if (!root) {
    console.error("madeby me: not a git repository.");
    process.exit(2);
    return;
  }

  const forTarget = parseFor(args);
  if (forTarget) {
    renderDiscloseFor("me", forTarget, discloseFor(root, forTarget, { category: withAi ? "with_ai" : "human", tool, model }));
    return;
  }

  if (args.includes("--print")) {
    // stdout carries only the trailer lines, so `$(madeby me --with-ai <tool> --print)` composes
    const t = disclosureTrailers(root, { category: withAi ? "with_ai" : "human", tool, model });
    if (!t.ok) {
      console.error("madeby me: set your git identity first (git config user.name / user.email).");
      process.exit(1);
      return;
    }
    console.log(t.lines.join("\n"));
    return;
  }

  const r = affirmAuthorship(root, { withAi, tool, model });
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
      ? `madeby me: made by me, with AI — affirmed human authorship + disclosed AI assistance on HEAD — "${r.subject}" (Authored-by-human: ${r.name}; Assisted-by: ${r.tool}).${r.modelSource && r.modelSource !== "as given (--model)" ? `\n  model from ${r.modelSource}.` : ""}`
      : `madeby me: affirmed human authorship on HEAD — "${r.subject}" (Authored-by-human: ${r.name}).`,
  );
}
