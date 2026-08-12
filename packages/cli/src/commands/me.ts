// `madeby me` — made by me: affirm you authored HEAD yourself, by adding an `Authored-by-human`
// trailer to the commit message. The symmetric human claim to `madeby ai`, and it climbs the SAME
// ladder — asserted testimony now, verified when the commit is signed. Honest by construction: you're
// putting your own name to your own work. It amends HEAD only (a testimony, never a content change),
// and refuses to fold in staged work.

import { execFileSync } from "node:child_process";
import { repoRoot } from "../scope";

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

// Matches the affirmative human-authorship trailer (kept in sync with core's HUMAN_ATTEST_RE).
const HUMAN_ATTEST = /^[ \t]*(?:Authored-by-human|Human-authored(?:-by)?)[ \t]*:/im;

export function meCommand(_args: string[]): void {
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

  if (HUMAN_ATTEST.test(message)) {
    console.log("madeby me: HEAD already affirms human authorship. Nothing to do.");
    process.exit(0);
    return;
  }

  execFileSync("git", ["-C", root, "commit", "--amend", "--no-edit", "--trailer", `Authored-by-human: ${name} <${email}>`]);
  console.log(`madeby me: affirmed human authorship on HEAD — "${subject}" (Authored-by-human: ${name}).`);
}
