// Fold witnessed span evidence into the mirror (#68). The commit-trailer signal under-detects AI
// (inline autocomplete leaves no trailer), so the highest-fidelity HONEST signal is the AI tool's
// own session log, captured into the `.madeby/` span manifest (#2 format). This reads those
// manifests — from a local checkout (filesystem) or a bare clone (git) — and summarizes the
// witnessed AI involvement the trailers missed. We do NOT invent AI involvement from noisy diff
// heuristics (that risks the over-claim sin / inferring about third parties); we only surface
// evidence that actually exists.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpanManifest, type SpanManifest } from "@madeby/core";

export interface SpanEvidence {
  /** total span attestations across the repo's manifests */
  readonly attestations: number;
  /** distinct files carrying a witnessed AI span */
  readonly files: number;
  /** AI providers/models seen, by attestation count */
  readonly providers: ReadonlyArray<{ provider: string; model: string; attestations: number }>;
  /** distinct evidence sources, e.g. ["claude-code-session-log"] */
  readonly sources: ReadonlyArray<string>;
}

function parseAll(texts: string[]): SpanManifest[] {
  const out: SpanManifest[] = [];
  for (const t of texts) {
    try {
      out.push(parseSpanManifest(t));
    } catch {
      // a malformed manifest is skipped, not trusted (fail safe)
    }
  }
  return out;
}

/** Read `.madeby/spans/*.json` from a local checkout. Returns [] if absent/unreadable. */
export function readSpanManifestsFromDir(repoDir: string): SpanManifest[] {
  let files: string[];
  try {
    files = readdirSync(join(repoDir, ".madeby", "spans")).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return parseAll(
    files.map((f) => {
      try {
        return readFileSync(join(repoDir, ".madeby", "spans", f), "utf8");
      } catch {
        return "";
      }
    }).filter(Boolean),
  );
}

/** Read `.madeby/spans/*.json` committed at HEAD of a (possibly bare/blobless) git repo. */
export function readSpanManifestsFromGit(repoDir: string): SpanManifest[] {
  let listing: string;
  try {
    listing = execFileSync("git", ["-C", repoDir, "ls-tree", "-r", "--name-only", "HEAD", ".madeby/spans"], {
      encoding: "utf8",
    });
  } catch {
    return [];
  }
  const paths = listing.split("\n").filter((p) => p.endsWith(".json"));
  return parseAll(
    paths.map((p) => {
      try {
        return execFileSync("git", ["-C", repoDir, "cat-file", "-p", `HEAD:${p}`], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      } catch {
        return "";
      }
    }).filter(Boolean),
  );
}

/** Summarize the witnessed AI span evidence across a set of manifests. */
export function summarizeSpanEvidence(manifests: readonly SpanManifest[]): SpanEvidence {
  const files = new Set<string>();
  const sources = new Set<string>();
  const byModel = new Map<string, { provider: string; model: string; attestations: number }>();
  let attestations = 0;

  for (const m of manifests) {
    for (const a of m.attestations) {
      attestations += 1;
      if (a.anchor.hint?.path) files.add(a.anchor.hint.path);
      sources.add(a.attribution.source);
      const key = `${a.attribution.provider}/${a.attribution.model}`;
      const cur = byModel.get(key) ?? { provider: a.attribution.provider, model: a.attribution.model, attestations: 0 };
      byModel.set(key, { ...cur, attestations: cur.attestations + 1 });
    }
  }

  return {
    attestations,
    files: files.size,
    providers: [...byModel.values()].sort((a, b) => b.attestations - a.attestations),
    sources: [...sources],
  };
}
