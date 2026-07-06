// On-demand mirror: shallow-clone a PUBLIC repo to a temp dir, analyze its history, throw the
// clone away (OPERATIONS.md §3 — "nearly stateless: shallow-clone, analyze, return; persist a
// claim only if claimed"). This is the acquisition action — "see your breakdown" — and it needs
// no DB, no providers, no Atlas; it runs on localhost. Persistent/at-scale ingestion is #10.
//
// Security: arbitrary user-supplied URLs are cloned server-side, so we (a) accept only https on an
// allowlisted host (no SSRF to internal hosts, no file://, no ssh), (b) use execFile (never a
// shell), (c) disable git's auth prompt so private repos fail fast instead of hanging, and (d) bound
// depth + time. We do a BARE, blobless clone — we read commit metadata via `git log`, never file
// contents — so it stays cheap.

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { readGitLog } from "./git";
import { analyzeCommits, type AnalysisResult } from "./analyze";
import { readSpanManifestsFromGit, summarizeSpanEvidence, type SpanEvidence } from "./provenance";
import { readDeclarationFromGit, summarizeDeclaration, type DeclarationEvidence } from "./declaration";

const execFileP = promisify(execFile);

const ALLOWED_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org", "codeberg.org", "git.sr.ht"]);
const NAME_RE = /^[A-Za-z0-9._-]+$/;

export interface AnalyzeRepoError {
  readonly error: string;
}
export type AnalyzeRepoResult =
  | (AnalysisResult & { readonly repo: string; readonly spanEvidence: SpanEvidence; readonly declaration: DeclarationEvidence })
  | AnalyzeRepoError;

export function isAnalyzeError(r: AnalyzeRepoResult): r is AnalyzeRepoError {
  return (r as AnalyzeRepoError).error !== undefined;
}

/**
 * Validate + normalize a user-supplied repo reference into a safe clone URL, or null if it isn't
 * an allowlisted public https repo. Lenient on input shape (bare host, extra path, `.git`, trailing
 * slash, deep links) — strict on host + owner/repo charset (no `..`, no shell metachars, no userinfo).
 */
export function normalizeRepoUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (!ALLOWED_HOSTS.has(u.hostname)) return null;

  const parts = u.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!owner || !repo || !NAME_RE.test(owner) || !NAME_RE.test(repo)) return null;

  return `https://${u.hostname}/${owner}/${repo}.git`;
}

export interface AnalyzeRepoOptions {
  /** shallow-clone depth cap (bounds cost on huge repos) */
  depth?: number;
  /** clone timeout in ms */
  timeoutMs?: number;
}

/** Clone a public repo to a temp dir, analyze its history, and clean up. Never throws. */
export async function analyzeRepo(repoUrl: string, opts: AnalyzeRepoOptions = {}): Promise<AnalyzeRepoResult> {
  const clean = normalizeRepoUrl(repoUrl);
  if (!clean) {
    return { error: "Enter a public https repo URL on github.com, gitlab.com, bitbucket.org, codeberg.org, or git.sr.ht." };
  }
  const depth = opts.depth ?? 3000;
  const timeout = opts.timeoutMs ?? 30_000;

  const dir = await mkdtemp(join(tmpdir(), "madeby-mirror-"));
  try {
    await execFileP(
      "git",
      ["clone", "--bare", "--filter=blob:none", "--no-tags", "--single-branch", "--depth", String(depth), clean, dir],
      { timeout, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } },
    );
    const commits = readGitLog(dir);
    if (commits.length === 0) return { error: "No commit history found — the repo may be empty or inaccessible." };
    const display = clean.replace(/^https:\/\//, "").replace(/\.git$/, "");
    // Fold in any witnessed span evidence the repo committed (.madeby/spans) — recall the
    // trailers missed, where it actually exists. Empty for the vast majority of repos.
    const spanEvidence = summarizeSpanEvidence(readSpanManifestsFromGit(dir));
    // Point to a self-hosted sworn declaration if the repo has one (we detect, we don't host).
    const declaration = await summarizeDeclaration(readDeclarationFromGit(dir));
    return { ...analyzeCommits(commits), repo: display, spanEvidence, declaration };
  } catch (e) {
    const killed = (e as { killed?: boolean }).killed;
    return { error: killed ? "Clone timed out — that repo may be too large for the v0 mirror." : "Couldn't clone that repo — is it public?" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
