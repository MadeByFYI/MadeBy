// Shared scope resolution for the commit-reading commands (check, recognize): find the repo root and
// resolve which commit range to read. An explicit range wins; else auto-detect the PR range from the
// CI env via the host adapters (ARCHITECTURE §12); else undefined ⇒ recent history. Kept tiny and
// shared so every primitive scopes commits identically.

import { execFileSync } from "node:child_process";
import { detectCiRange } from "@madeby/analyzer";

/** The repository root for the current working directory, or null if not a git repo. */
export function repoRoot(): string | null {
  try {
    return execFileSync("git", ["-c", "core.quotePath=false", "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export interface Scope {
  /** the commit range to read, or undefined ⇒ recent history */
  range?: string;
  /** the host id when the range was CI-auto-detected (for a user-facing note) */
  autoHost?: string;
}

/** Explicit range wins; else the CI-auto-detected PR range; else recent history. */
export function resolveRange(explicit?: string): Scope {
  if (explicit) return { range: explicit };
  const ci = detectCiRange();
  return ci ? { range: ci.range, autoHost: ci.host } : {};
}
