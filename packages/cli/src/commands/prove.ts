// `madeby prove [<log>] [<ref>]` — the disclosure on-ramp. Reads your OWN AI-tool session log
// locally, confirms the AI's work is structurally present in your checkout, and writes witnessed
// span evidence to .madeby/spans. Privacy-clean: logs/content never leave the machine; only derived
// attribution is written. Same engine as the dev script (captureLocalSpans in @madeby/analyzer).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { captureLocalSpans, detectParser } from "@madeby/analyzer";

interface StoredAttestation {
  attribution?: { source?: string };
}

export function proveCommand(args: string[]): void {
  const git = (...a: string[]) =>
    execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();

  let repoRoot: string;
  try {
    repoRoot = git("rev-parse", "--show-toplevel");
  } catch {
    console.error("madeby prove: not a git repository.");
    process.exit(2);
    return;
  }

  const autodiscover = (): string | null => {
    const enc = repoRoot.replace(/[/_]/g, "-");
    try {
      const dir = join(homedir(), ".claude", "projects", enc);
      return (
        readdirSync(dir)
          .filter((f) => f.endsWith(".jsonl"))
          .map((f) => join(dir, f))
          .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null
      );
    } catch {
      return null;
    }
  };

  const transcriptPath = args[0] ?? autodiscover();
  if (!transcriptPath || !existsSync(transcriptPath)) {
    console.error("madeby prove: transcript not found — pass it: madeby prove <transcript.jsonl> [ref]");
    process.exit(1);
    return;
  }
  const commit = git("rev-parse", args[1] ?? "HEAD");

  const transcriptText = readFileSync(transcriptPath, "utf8");
  const parser = detectParser(transcriptText);
  if (!parser) {
    console.error(
      "madeby prove: unrecognized log format — no registered tool parser matched. (Claude Code is supported today.)",
    );
    process.exit(1);
    return;
  }

  const result = captureLocalSpans({
    transcript: transcriptText,
    parser,
    repoRoot,
    readFile: (rel) => {
      try {
        return readFileSync(join(repoRoot, rel), "utf8");
      } catch {
        return null;
      }
    },
    commit,
    operatorId: git("show", "-s", "--format=%ae", commit),
    now: new Date().toISOString(),
  });

  if (result.manifest.attestations.length === 0) {
    console.log(
      `madeby prove: no AI-authored content from the session is structurally present in this checkout ` +
        `(matched 0, discarded ${result.discarded.length}). Nothing recorded.`,
    );
    process.exit(0);
    return;
  }

  // Merge: replace this tool's session-log attestations, keep everything else (other tools, trailers).
  const out = join(repoRoot, ".madeby", "spans", `${commit}.json`);
  let kept: StoredAttestation[] = [];
  if (existsSync(out)) {
    const thisSource = `${result.tool}-session-log`;
    try {
      const prior = JSON.parse(readFileSync(out, "utf8")) as { attestations?: StoredAttestation[] };
      kept = (prior.attestations ?? []).filter((a) => a?.attribution?.source !== thisSource);
    } catch {
      /* overwrite a malformed manifest */
    }
  }
  const manifest = { ...result.manifest, attestations: [...kept, ...result.manifest.attestations] };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `madeby prove: wrote ${out} — [${result.tool}] ${result.matched.length} witnessed file(s) matched, ` +
      `${result.discarded.length} discarded (not present in the checkout).`,
  );
}
