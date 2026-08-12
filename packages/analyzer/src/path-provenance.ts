// The agent-context read (STRATEGY §1 "provenance as context"). For a path — optionally a line range
// — compose what's ON THE RECORD about its origin, at whatever resolution it was recorded:
//   • witnessed AI spans (.madeby/spans) at their captured line ranges — model/tool, high confidence;
//   • last-touch commit disclosure from `git blame` elsewhere — approximate, commit-granular;
//   • unknown everywhere else.
// The universal contract is the LINE RANGE (path, startLine, endLine) — MadeBy never parses code
// (ARCHITECTURE §12 decision): a caller wanting function/symbol resolution turns a symbol into a line
// range with their own existing tooling (tree-sitter/LSP/ctags) and queries at that range. Every
// record is labeled with its granularity + confidence; we never present last-touch blame as fine
// authorship, and we never assert "human" (disclosure, not detection).

import { execFileSync } from "node:child_process";
import { commitDisclosureKinds, type DisclosureKind } from "@madeby/core";
import { isBotIdentity } from "@madeby/classify";
import { readSpanManifestsFromDir } from "./provenance";
import { recognizeCommits } from "./recognize";

export interface ProvenanceRecord {
  /** where the signal came from */
  source: "span" | "blame";
  /** the resolution this record is anchored at */
  granularity: "region" | "commit";
  startLine?: number;
  endLine?: number;
  /** disclosed AI involvement (a span, or a commit AI-trailer) */
  ai: boolean;
  bot: boolean;
  /** for spans: the disclosed model/tool */
  provider?: string;
  model?: string;
  /** for blame: the last-touch commit (short sha) */
  commit?: string;
  /** the disclosure kinds recognized on the touching commit (blame) */
  disclosures?: DisclosureKind[];
  /** witnessed (a matched AI session log) > disclosed (a commit stated something) > none (unknown) */
  confidence: "witnessed" | "disclosed" | "none";
  evidence: string;
}

export interface PathProvenance {
  path: string;
  /** the default resolution + the fact that it's configurable (ARCH §12) */
  resolution: string;
  records: ProvenanceRecord[];
}

const overlaps = (aS: number, aE: number, bS?: number, bE?: number): boolean =>
  bS === undefined || bE === undefined || (aS <= bE && aE >= bS);

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, "-c", "core.quotePath=false", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

const US = "\x1f";

/** message + signature-presence + author for one commit (for last-touch disclosure). Null on failure. */
function commitMeta(root: string, sha: string): { message: string; signed: boolean; name: string; email: string } | null {
  try {
    const out = git(root, ["show", "-s", `--format=%G?${US}%an${US}%ae${US}%B`, sha]);
    const parts = out.split(US);
    const sig = parts[0] ?? "N";
    return { signed: sig !== "N" && sig !== "", name: parts[1] ?? "", email: parts[2] ?? "", message: (parts.slice(3).join(US) ?? "").trim() };
  } catch {
    return null;
  }
}

/** Parse `git blame --porcelain` into contiguous (startLine, endLine, sha) groups. */
function blameGroups(porcelain: string): { start: number; end: number; sha: string }[] {
  const header = /^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/;
  const perLine: { line: number; sha: string }[] = [];
  for (const ln of porcelain.split("\n")) {
    const m = header.exec(ln);
    if (m) perLine.push({ line: Number(m[2]), sha: m[1]! });
  }
  perLine.sort((a, b) => a.line - b.line);
  const groups: { start: number; end: number; sha: string }[] = [];
  for (const { line, sha } of perLine) {
    const last = groups[groups.length - 1];
    if (last && last.sha === sha && line === last.end + 1) last.end = line;
    else groups.push({ start: line, end: line, sha });
  }
  return groups;
}

/**
 * Compose the provenance on the record for `path` (optionally scoped to a line range). Reads local
 * `.madeby/spans` + `git blame`; never throws (degrades to whatever is available). `useBlame:false`
 * returns spans only.
 */
export function provenanceOf(
  root: string,
  path: string,
  opts: { startLine?: number; endLine?: number; useBlame?: boolean } = {},
): PathProvenance {
  const records: ProvenanceRecord[] = [];

  // 1) witnessed spans (region-level, precise) — from the committed .madeby/spans.
  for (const manifest of readSpanManifestsFromDir(root)) {
    for (const a of manifest.attestations) {
      const hint = a.anchor.hint;
      if (!hint || hint.path !== path) continue;
      const s = hint.startLine ?? 1;
      const e = hint.endLine ?? s;
      if (!overlaps(s, e, opts.startLine, opts.endLine)) continue;
      records.push({
        source: "span",
        granularity: "region",
        startLine: hint.startLine,
        endLine: hint.endLine,
        ai: true,
        bot: false,
        provider: a.attribution.provider,
        model: a.attribution.model,
        confidence: "witnessed",
        evidence: `witnessed AI span — ${a.attribution.model} (${a.attribution.source})`,
      });
    }
  }

  // 2) last-touch commit disclosure (approximate, commit-granular) — from git blame.
  if (opts.useBlame !== false) {
    try {
      const range = opts.startLine !== undefined ? [`-L`, `${opts.startLine},${opts.endLine ?? opts.startLine}`] : [];
      const porcelain = git(root, ["blame", "--porcelain", ...range, "--", path]);
      const metaCache = new Map<string, ReturnType<typeof commitMeta>>();
      for (const g of blameGroups(porcelain)) {
        let meta = metaCache.get(g.sha);
        if (meta === undefined) {
          meta = commitMeta(root, g.sha);
          metaCache.set(g.sha, meta);
        }
        if (!meta) continue;
        const kinds = commitDisclosureKinds({ message: meta.message, signed: meta.signed });
        const bot = isBotIdentity(meta.name, meta.email);
        const ai = kinds.includes("ai-trailer");
        const disclosed = kinds.length > 0 || bot;
        const short = g.sha.slice(0, 8);
        records.push({
          source: "blame",
          granularity: "commit",
          startLine: g.start,
          endLine: g.end,
          ai,
          bot,
          commit: short,
          disclosures: kinds,
          confidence: disclosed ? "disclosed" : "none",
          evidence: disclosed
            ? `last-touch: ${short} disclosed via ${bot ? "bot" : kinds.join(", ")}`
            : `last-touch: ${short} — undisclosed (origin unknown)`,
        });
      }
    } catch {
      // no blame (path absent, not a git repo, …) → spans-only; never throw
    }
  }

  records.sort((a, b) => (a.startLine ?? 0) - (b.startLine ?? 0) || (a.source === "span" ? -1 : 1));
  return {
    path,
    resolution:
      "default: witnessed spans (region) + git-blame last-touch (commit); unknown otherwise. " +
      "Granularity is a configurable convention — query a line range from your own resolver (ARCH §12).",
    records,
  };
}

// ---- repo-wide provenance map -------------------------------------------------------------------
// The orientation an agent reads BEFORE it works: the witnessed AI surface across the repo (precise,
// from .madeby/spans) plus commit-level disclosure coverage. Cheap by construction — spans + one
// recognize pass + `ls-files`, NO per-file blame. Files without a witnessed span have unknown origin
// (disclosure, not detection — never "human"). Scope to a path prefix for a subtree.

export interface WitnessedFile {
  path: string;
  /** distinct disclosed models across this file's witnessed spans */
  models: string[];
  regions: { startLine?: number; endLine?: number; model: string }[];
}

export interface ProvenanceMap {
  scope: string;
  trackedFiles: number;
  witnessedFiles: number;
  /** files carrying witnessed AI spans — the precise, model-named AI surface */
  witnessed: WitnessedFile[];
  /** commit-level disclosure coverage over the recent window (context, not per-file authorship) */
  commitCoverage: { disclosed: number; total: number };
  summary: string;
  note: string;
}

export function provenanceMap(root: string, opts: { prefix?: string; commitLimit?: number } = {}): ProvenanceMap {
  const prefix = opts.prefix;

  // witnessed AI surface — precise, from the committed .madeby/spans
  const byPath = new Map<string, WitnessedFile>();
  for (const m of readSpanManifestsFromDir(root)) {
    for (const a of m.attestations) {
      const p = a.anchor.hint?.path;
      if (!p || (prefix && !p.startsWith(prefix))) continue;
      let wf = byPath.get(p);
      if (!wf) {
        wf = { path: p, models: [], regions: [] };
        byPath.set(p, wf);
      }
      wf.regions.push({ startLine: a.anchor.hint?.startLine, endLine: a.anchor.hint?.endLine, model: a.attribution.model });
      if (!wf.models.includes(a.attribution.model)) wf.models.push(a.attribution.model);
    }
  }
  const witnessed = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));

  // tracked file count (cheap)
  let trackedFiles = 0;
  try {
    trackedFiles = git(root, ["ls-files", ...(prefix ? ["--", prefix] : [])]).split("\n").filter(Boolean).length;
  } catch {
    /* not a git repo → 0 */
  }

  // commit-level disclosure coverage (one pass; context, deliberately NOT claimed per-file)
  const commits = recognizeCommits(root, { limit: opts.commitLimit ?? 500 });
  const disclosed = commits.filter((c) => c.disclosures.length > 0).length;
  const pct = commits.length ? Math.round((disclosed / commits.length) * 100) : 0;
  const scope = prefix ?? "repo";
  const allModels = [...new Set(witnessed.flatMap((w) => w.models))];

  return {
    scope,
    trackedFiles,
    witnessedFiles: witnessed.length,
    witnessed,
    commitCoverage: { disclosed, total: commits.length },
    summary:
      `${scope}: ${trackedFiles} tracked file${trackedFiles === 1 ? "" : "s"}; ` +
      `${witnessed.length} with witnessed AI provenance${allModels.length ? ` (${allModels.join(", ")})` : ""}; ` +
      `${pct}% of the last ${commits.length} commits disclose origin.`,
    note:
      "Witnessed spans are precise (region-level, model-named); commit coverage is commit-level, not " +
      "per-file authorship. Files without a witnessed span have unknown origin — disclosure, not " +
      "detection: we report what's disclosed and never infer origin we can't see. Resolution is a " +
      "configurable convention (ARCH §12).",
  };
}
