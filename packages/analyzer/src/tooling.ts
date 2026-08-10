// Zero-network AI-tooling detection (STRATEGY §3 reframe, "Branch B" fuel). The commit-trailer
// signal misses inline-AI users (Copilot/Cursor tab-completion leaves no trailer) — but those repos
// very often COMMIT the tool's own config file. Its presence in the tree is honest, zero-cost
// evidence that the repo uses AI tooling: we read the HEAD file listing (names only — no blob
// fetch, works on the bare/blobless mirror clone) and match known config paths. This is EVIDENCE
// (a declared artifact is present), never stylistic inference — the same discipline as the
// trailer/author AI_PATTERNS in @madeby/classify.
//
// It is a REPO-LEVEL disclosure, deliberately kept separate from the per-commit Disclosure Score
// (folding a repo-level signal into a per-commit rate is a category error). It sharpens the honest
// message for the exact user the per-commit score under-counts: "you clearly use Cursor, but N% of
// your commits don't disclose it — raise your score."

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface AiToolConfig {
  /** stable tool id, e.g. "cursor" */
  id: string;
  /** display name */
  name: string;
  /** the AI vendor/provider */
  provider: string;
  /**
   * Repo-relative markers that prove this tool is configured. A marker matches if a tracked path
   * equals it (a file) or is inside it (a `dir/` prefix). Evidence-grade only — chosen to not
   * collide with ordinary project files.
   */
  markers: readonly string[];
}

// Open registry — extend as tools add committed configs. Kept evidence-grade: each marker is a
// file/dir a tool specifically creates, not a generic name that a non-AI project would carry.
export const AI_TOOL_CONFIGS: readonly AiToolConfig[] = [
  { id: "cursor", name: "Cursor", provider: "cursor", markers: [".cursor/", ".cursorrules"] },
  { id: "github-copilot", name: "GitHub Copilot", provider: "github-copilot", markers: [".github/copilot-instructions.md"] },
  { id: "aider", name: "aider", provider: "aider", markers: [".aider.conf.yml", ".aider.conf.yaml", ".aiderignore"] },
  { id: "windsurf", name: "Windsurf", provider: "codeium", markers: [".windsurf/", ".windsurfrules", ".codeiumignore"] },
  { id: "continue", name: "Continue", provider: "continue", markers: [".continue/"] },
  { id: "cline", name: "Cline", provider: "cline", markers: [".clinerules"] },
  { id: "claude-code", name: "Claude Code", provider: "anthropic", markers: [".claude/", "CLAUDE.md"] },
  { id: "gemini-cli", name: "Gemini", provider: "google", markers: [".gemini/", "GEMINI.md"] },
  { id: "agents", name: "Agent instructions", provider: "unknown", markers: ["AGENTS.md"] },
];

export interface DetectedTool {
  id: string;
  name: string;
  provider: string;
  /** the tracked path that proved it (the pointer to the evidence) */
  evidencePath: string;
}

export interface ToolingEvidence {
  /** distinct AI tools whose config is committed to the repo */
  readonly tools: readonly DetectedTool[];
}

const EMPTY: ToolingEvidence = { tools: [] };

function matchMarker(paths: readonly string[], marker: string): string | undefined {
  if (marker.endsWith("/")) return paths.find((p) => p === marker.slice(0, -1) || p.startsWith(marker));
  return paths.find((p) => p === marker);
}

/** Pure: given the repo's tracked paths, which AI tools are configured (first proving path each). */
export function detectTooling(paths: readonly string[]): ToolingEvidence {
  const tools: DetectedTool[] = [];
  for (const cfg of AI_TOOL_CONFIGS) {
    for (const marker of cfg.markers) {
      const hit = matchMarker(paths, marker);
      if (hit) {
        tools.push({ id: cfg.id, name: cfg.name, provider: cfg.provider, evidencePath: hit });
        break; // one proving path per tool is enough
      }
    }
  }
  return { tools };
}

/** List tracked paths at HEAD of a (possibly bare/blobless) git repo — names only, no blob fetch. */
export function readToolingFromGit(repoDir: string): ToolingEvidence {
  let listing: string;
  try {
    listing = execFileSync("git", ["-C", repoDir, "ls-tree", "-r", "--name-only", "HEAD"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return EMPTY;
  }
  return detectTooling(listing.split("\n").filter(Boolean));
}

/** Detect tooling in a local checkout by probing known marker paths (no full directory walk). */
export function readToolingFromDir(repoDir: string): ToolingEvidence {
  const present: string[] = [];
  for (const cfg of AI_TOOL_CONFIGS) {
    for (const marker of cfg.markers) {
      const rel = marker.endsWith("/") ? marker.slice(0, -1) : marker;
      // matchMarker matches a dir marker against its bare path (`.cursor/` ↔ `.cursor`).
      if (existsSync(join(repoDir, rel))) present.push(rel);
    }
  }
  return detectTooling(present);
}
