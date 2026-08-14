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

export function meCommand(args: string[]): void {
  const { withAi, tool } = parseWithAi(args);
  const root = repoRoot();
  if (!root) {
    console.error("madeby me: not a git repository.");
    process.exit(2);
    return;
  }

  let name = "";
  let email = "";
  try {
    name = git(root, ["config", "user.name"]);
    email = git(root, ["config", "user.email"]);
  } catch {
    /* fall through to the identity check */
  }
  if (!name || !email) {
    console.error("madeby me: set your git identity first (git config user.name / user.email).");
    process.exit(1);
    return;
  }

  // `me` affirms the last commit — it does not amend content. Refuse to silently fold in staged work.
  try {
    execFileSync("git", ["-C", root, "diff", "--cached", "--quiet"]);
  } catch {
    console.error("madeby me: you have staged changes. Commit them first — `me` affirms HEAD, not your index.");
    process.exit(1);
    return;
  }

  let subject = "";
  let message = "";
  try {
    subject = git(root, ["show", "-s", "--format=%s", "HEAD"]);
    message = git(root, ["show", "-s", "--format=%B", "HEAD"]);
  } catch {
    console.error("madeby me: no commit to affirm — make a commit first.");
    process.exit(1);
    return;
  }

  // What's already on HEAD — so re-running is idempotent per trailer, and `--with-ai` can add the
  // assistance disclosure to a commit that already affirms human authorship (and vice versa).
  const hasHuman = HUMAN_ATTEST.test(message);
  const hasAssist = /^[ \t]*Assisted-by[ \t]*:/im.test(message);

  const trailers: string[] = [];
  if (!hasHuman) trailers.push("--trailer", `Authored-by-human: ${name} <${email}>`);
  if (withAi && !hasAssist) trailers.push("--trailer", `Assisted-by: ${tool}`);

  if (trailers.length === 0) {
    const already = withAi ? "already affirms human authorship and discloses AI assistance" : "already affirms human authorship";
    console.log(`madeby me: HEAD ${already}. Nothing to do.`);
    process.exit(0);
    return;
  }

  execFileSync("git", ["-C", root, "commit", "--amend", "--no-edit", ...trailers]);
  console.log(
    withAi
      ? `madeby me: made by me, with AI — affirmed human authorship + disclosed AI assistance on HEAD — "${subject}" (Authored-by-human: ${name}; Assisted-by: ${tool}).`
      : `madeby me: affirmed human authorship on HEAD — "${subject}" (Authored-by-human: ${name}).`,
  );
}
