#!/usr/bin/env node
// `find-targets` — surface OSS repos already grappling with AI-generated PRs, so outreach
// (GTM/maintainer-outreach.md) can start from maintainers who've SELF-IDENTIFIED, not a cold blast.
//
//   node scripts/find-targets.mjs            # ranked, tagged list to stdout
//   node scripts/find-targets.mjs --json     # machine-readable
//   node scripts/find-targets.mjs --limit 20 # widen each search (default 15)
//
// Requires the `gh` CLI, authenticated (`gh auth status`). Nothing here touches our own infra —
// it's just GitHub search + a stars lookup to rank.
//
// The honest method (see GTM/maintainer-outreach.md → "Finding targets"): you can't count a repo's
// AI PRs directly, because the slop is UNDISCLOSED — that's the whole problem MadeBy exists to
// close. So the reliable signal that a repo is "dealing with a lot of AI PRs" is that a maintainer
// publicly REACTED. We look for three reactions, warmest first:
//   [template] they put an AI-disclosure question in their PR template  — they already do our thing
//              by hand; we just automate + enforce it. The warmest possible pitch.
//   [policy]   they wrote an AI-PR rule into CONTRIBUTING                — they felt it and acted.
//   [complaint] an open issue/proposal about AI-PR slop right now        — perfect timing.
// Keyword-based (finds our phrasings, misses silent sufferers) and rate-limited — a target finder,
// not a census.

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const limIdx = args.indexOf("--limit");
const LIMIT = limIdx >= 0 ? Math.max(1, parseInt(args[limIdx + 1], 10) || 15) : 15;

// Each search maps hits → a tag. `kind` selects the `gh search` subcommand + how we read repos.
const SEARCHES = [
  { tag: "template", weight: 3, kind: "code", args: ["code", "AI-generated", "--filename=pull_request_template.md"] },
  { tag: "policy", weight: 2, kind: "code", args: ["code", "AI-generated pull requests", "--filename=CONTRIBUTING.md"] },
  { tag: "complaint", weight: 1, kind: "issues", args: ["issues", "AI-generated pull requests", "--state=open"] },
];

// Repos whose very name says "this is an automated feed / paper bot", not a project a human
// maintains — the dominant noise in the open-issue search. Dropped from complaint hits only.
const NOISE = /(^|[-_/])(bot|arxiv|news|daily|digest|feed|mirror|awesome)([-_/]|$)/i;

function gh(argv) {
  try {
    return execFileSync("gh", argv, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function search({ tag, kind, args }) {
  const jsonFields = kind === "code" ? "repository" : "repository,title";
  const out = gh(["search", ...args, "--limit", String(LIMIT), "--json", jsonFields]);
  if (!out) return [];
  let rows;
  try {
    rows = JSON.parse(out);
  } catch {
    return [];
  }
  const hits = [];
  for (const r of rows) {
    const nameWithOwner = r.repository?.nameWithOwner;
    if (!nameWithOwner) continue;
    if (tag === "complaint" && NOISE.test(nameWithOwner)) continue; // drop paper/news bots
    hits.push({ nameWithOwner, tag, note: r.title });
  }
  return hits;
}

function stars(nameWithOwner) {
  const out = gh(["api", `repos/${nameWithOwner}`, "-q", ".stargazers_count"]).trim();
  const n = parseInt(out, 10);
  return Number.isFinite(n) ? n : -1; // -1 = unknown / not found (deleted or renamed)
}

// An `owner/.github` hit is an ORG-WIDE PR template — its own star count is meaningless (the
// `.github` repo has ~none), but it governs every repo in the org. Rank it by the org's flagship
// (top-starred) repo instead, and surface that repo as the real point of contact.
function flagship(owner) {
  const out = gh(["search", "repos", "--owner", owner, "--sort", "stars", "--limit", "1", "--json", "stargazersCount,fullName"]);
  try {
    const top = JSON.parse(out)[0];
    if (top) return { stars: top.stargazersCount ?? -1, nameWithOwner: top.fullName };
  } catch {
    /* fall through */
  }
  return null;
}

// --- collect + dedupe across signals (a repo can carry more than one tag) ---
const byRepo = new Map();
for (const s of SEARCHES) {
  for (const hit of search(s)) {
    const cur = byRepo.get(hit.nameWithOwner) ?? { nameWithOwner: hit.nameWithOwner, tags: new Set(), weight: 0, note: undefined };
    if (!cur.tags.has(hit.tag)) cur.weight += s.weight;
    cur.tags.add(hit.tag);
    if (hit.tag === "complaint" && hit.note && !cur.note) cur.note = hit.note; // the issue title is the useful color
    byRepo.set(hit.nameWithOwner, cur);
  }
}

if (byRepo.size === 0) {
  console.error("No hits. Is `gh` authenticated? Try: gh auth status");
  process.exit(byRepo.size === 0 ? 2 : 0);
}

// --- rank: stars first (reach seeds both sides of the flywheel), then signal weight ---
const targets = [...byRepo.values()].map((t) => {
  const base = { ...t, tags: [...t.tags] };
  if (/\/\.github$/.test(t.nameWithOwner)) {
    const owner = t.nameWithOwner.split("/")[0];
    const top = flagship(owner);
    if (top) return { ...base, stars: top.stars, orgWide: true, contact: top.nameWithOwner };
  }
  return { ...base, stars: stars(t.nameWithOwner) };
});
targets.sort((a, b) => b.stars - a.stars || b.weight - a.weight);

if (asJson) {
  console.log(JSON.stringify(targets, null, 2));
  process.exit(0);
}

const star = (n) => (n < 0 ? "     ?" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`.padStart(6) : String(n).padStart(6));
console.log(`\nAI-PR outreach targets — ${targets.length} repos, ranked by reach\n`);
for (const t of targets) {
  const tags = t.tags.sort().map((x) => `[${x}]`).join(" ");
  const org = t.orgWide ? `  (org-wide → ${t.contact})` : "";
  const note = t.note ? `  — ${t.note}` : "";
  console.log(`${star(t.stars)}★  ${t.nameWithOwner.padEnd(30)} ${tags}${org}${note}`);
}
console.log(`
tags: [template] already asks contributors to disclose AI (warmest) · [policy] wrote an AI-PR rule · [complaint] open issue/proposal now
honest limits: keyword-based (misses silent sufferers), rate-limited, star counts approximate. A target finder, not a census.
next: open GTM/maintainer-outreach.md and start with the highest-reach [template] rows.
`);
