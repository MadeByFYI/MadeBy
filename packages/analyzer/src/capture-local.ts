// `madeby capture --local` engine (#80) — the PRIMARY recall fix. Reads the user's OWN AI-tool
// session log locally and turns it into WITNESSED span evidence: the tool recorded what it wrote,
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

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

export interface CaptureLocalInput {
  /** raw Claude Code transcript (JSONL) */
  transcript: string;
  /** absolute repo root, used to relativize the transcript's file paths */
  repoRoot: string;
  /** current content of a repo-relative path, or null if absent (the CLI backs this with fs) */
  readFile: (relPath: string) => string | null;
  commit: string;
  operatorId: string;
  /** RFC 3339 capture time */
  now: string;
  /** structural-similarity floor below which AI work is treated as not-present (default 0.5) */
  threshold?: number;
}

export interface CaptureLocalResult {
  manifest: SpanManifest;
  /** files whose AI content matched the committed content (attested) */
  matched: string[];
  /** files where the AI content was not structurally present (discarded, honestly not attested) */
  discarded: string[];
}

interface FileAi {
  content: string[];
  models: Set<string>;
}

/** Parse the transcript into per-repo-file AI-authored content + the model(s) that wrote it. */
function aiContentByFile(transcript: string, repoRoot: string): Map<string, FileAi> {
  const out = new Map<string, FileAi>();
  for (const line of transcript.split("\n")) {
    if (!line.trim()) continue;
    let rec: { type?: string; message?: { model?: string; content?: unknown[] } };
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type !== "assistant" || !Array.isArray(rec.message?.content)) continue;
    const model = rec.message?.model ?? "claude";
    for (const block of rec.message!.content as Array<Record<string, unknown>>) {
      if (block?.type !== "tool_use" || !WRITE_TOOLS.has(block.name as string)) continue;
      const input = block.input as { file_path?: string; content?: string; new_string?: string } | undefined;
      const fp = input?.file_path;
      if (typeof fp !== "string" || !fp.startsWith(repoRoot + "/")) continue;
      const rel = fp.slice(repoRoot.length + 1);
      if (rel.startsWith(".madeby/") || rel.includes("node_modules/")) continue;
      const chunk = input?.content ?? input?.new_string ?? "";
      if (!chunk) continue;
      const cur = out.get(rel) ?? { content: [], models: new Set<string>() };
      cur.content.push(chunk);
      cur.models.add(model);
      out.set(rel, cur);
    }
  }
  return out;
}

/** Turn a local session log into witnessed, structurally-matched span attestations. */
export function captureLocalSpans(input: CaptureLocalInput): CaptureLocalResult {
  const threshold = input.threshold ?? 0.5;
  const byFile = aiContentByFile(input.transcript, input.repoRoot);

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
        attribution: { provider: "anthropic", model, operatorId: input.operatorId, source: "claude-code-session-log" },
      });
    }
  }

  return {
    manifest: { version: "0", commit: input.commit, generatedAt: input.now, attestations },
    matched,
    discarded,
  };
}
