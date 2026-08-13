// The span-capture engine (#80) behind `madeby ai` — the PRIMARY recall fix. Reads the user's OWN
// AI-tool session log locally and turns it into WITNESSED span evidence: the tool recorded what it wrote,
// and we confirm that content is structurally present in the repo. Unlike #68's blob-SHA-at-a-commit
// anchor, we anchor by the AI content's **structural fingerprint** (the §4 span anchor) and match by
// structural similarity, so attribution survives squash / rebase / reformat. AI work that didn't
// make it into the repo (low similarity) is honestly NOT attested.
//
// Pure by design (transcript text + a content-reader callback in → manifest out) so it's hermetically
// testable and the CLI shell (scripts/capture-local.mjs) owns all fs/git. Privacy-clean: only derived
// attribution (fingerprint + path + model) is produced; the logs and content never leave the engine.

import { structuralFingerprint, cosineSimilarity } from "@madeby/core/structural";
import type { SpanManifest, SpanAttestationV0 } from "@madeby/core"; // type-only → erased at runtime
// Type-only so this stays runtime-import-free (the CLI runs the engine under Node type-stripping,
// which can't resolve extensionless relative *value* imports). The caller supplies the parser;
// detect it with detectParser() from tool-parsers.
import type { ToolParser, AiEdit } from "./tool-parsers";

export interface CaptureLocalInput {
  /** raw AI-tool session log (e.g. a Claude Code transcript) */
  transcript: string;
  /** absolute repo root, used to relativize the tool's file paths */
  repoRoot: string;
  /** current content of a repo-relative path, or null if absent (the CLI backs this with fs) */
  readFile: (relPath: string) => string | null;
  commit: string;
  operatorId: string;
  /** RFC 3339 capture time */
  now: string;
  /** structural-similarity floor below which AI work is treated as not-present (default MATCH_THRESHOLD) */
  threshold?: number;
  /** the tool parser for this log (detect it with detectParser); omitted ⇒ no-op */
  parser?: ToolParser;
}

export interface CaptureLocalResult {
  manifest: SpanManifest;
  /** the tool parser that recognized the log, or null if none did */
  tool: string | null;
  /** files whose AI content matched the committed content (attested) */
  matched: string[];
  /** files where the AI content was not structurally present (discarded, honestly not attested) */
  discarded: string[];
}

// The calibrated structural-match floor (#86; TESTING §5). NOT a magic number: chosen as the midpoint
// of the precision-1.0 band on a labeled corpus (see match-calibration.ts / MATCH-CALIBRATION.md),
// biased toward DISCARD — precision over recall, so a witnessed attestation never over-claims content
// the AI didn't actually ship. `match-calibration.test.ts` asserts this equals the harness's derived
// value, so it cannot silently drift from the corpus.
export const MATCH_THRESHOLD = 0.52;

interface FileAi {
  content: string[];
  models: Set<string>;
}

/** Normalize a tool-recorded path to a repo-relative path, or null if it lies outside the repo.
 *  Handles both the absolute paths Claude Code records and the repo-relative paths aider records
 *  (incl. Windows backslashes); anything absolute-but-outside or escaping via `../` is rejected. */
function repoRelative(recorded: string, repoRoot: string): string | null {
  const p = recorded.replace(/\\/g, "/");
  const root = repoRoot.replace(/\\/g, "/");
  if (p.startsWith(root + "/")) return p.slice(root.length + 1); // absolute, under the repo
  if (p.startsWith("/")) return null; // absolute, outside the repo
  if (p === ".." || p.startsWith("../")) return null; // relative but escapes the repo
  return p.replace(/^\.\//, ""); // already repo-relative
}

/** Group a parser's flat edits into per-repo-file AI content, relativized + filtered to the repo. */
function groupEdits(edits: readonly AiEdit[], repoRoot: string): Map<string, FileAi> {
  const out = new Map<string, FileAi>();
  for (const e of edits) {
    const rel = repoRelative(e.path, repoRoot);
    if (rel === null) continue; // outside the repo
    if (rel.startsWith(".madeby/") || rel.includes("node_modules/")) continue; // don't attest our own records
    if (!e.content) continue;
    const cur = out.get(rel) ?? { content: [], models: new Set<string>() };
    cur.content.push(e.content);
    cur.models.add(e.model);
    out.set(rel, cur);
  }
  return out;
}

/** Turn a local session log into witnessed, structurally-matched span attestations. */
export function captureLocalSpans(input: CaptureLocalInput): CaptureLocalResult {
  const threshold = input.threshold ?? MATCH_THRESHOLD;
  const parser = input.parser;
  const empty: CaptureLocalResult = {
    manifest: { version: "0", commit: input.commit, generatedAt: input.now, attestations: [] },
    tool: null,
    matched: [],
    discarded: [],
  };
  if (!parser) return empty; // no recognized tool → nothing to attest (honest no-op)

  const byFile = groupEdits(parser.parse(input.transcript), input.repoRoot);

  const attestations: SpanAttestationV0[] = [];
  const matched: string[] = [];
  const discarded: string[] = [];

  for (const [rel, ai] of byFile) {
    const current = input.readFile(rel);
    if (current === null) {
      discarded.push(rel);
      continue;
    }
    const aiFp = structuralFingerprint(ai.content.join("\n"));
    const curFp = structuralFingerprint(current);
    const similarity = cosineSimilarity(aiFp.embedding, curFp.embedding);
    if (similarity < threshold) {
      discarded.push(rel); // the AI's work isn't present in the committed file — don't claim it
      continue;
    }
    matched.push(rel);
    for (const model of ai.models) {
      attestations.push({
        anchor: { fingerprint: aiFp.fingerprint, hint: { path: rel } },
        attribution: { provider: parser.provider, model, operatorId: input.operatorId, source: `${parser.id}-session-log` },
      });
    }
  }

  return {
    manifest: { version: "0", commit: input.commit, generatedAt: input.now, attestations },
    tool: parser.id,
    matched,
    discarded,
  };
}
