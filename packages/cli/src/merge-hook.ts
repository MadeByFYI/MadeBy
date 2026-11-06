// The merge hook (#227): merges a developer finishes locally carry the disclosure they declared once.
// In a no-rebase repo that merges each branch into several targets, every conflict resolution is a
// merge with changes of its own, so `check` scores it — and git's default message discloses nothing.
//
// Disclosure, not detection: the hook only writes what the developer has said. The standing
// declaration lives in the clone's git config (`madeby.merge`: `human`, `with_ai:<tool>` or
// `ai:<tool>`), set by `madeby me --merges` / `madeby me --with-ai <tool> --merges` / `madeby ai
// <tool> --merges`. Without one, the hook offers commented-out lines when an editor opens, and adds
// nothing when none does. A message that already discloses (an agent's own trailer) is left alone, and
// so is a clean merge — it isn't scored.
//
// Hooks aren't versioned with a repo, so each developer installs it once per clone. The script lives
// at <git common dir>/madeby/prepare-commit-msg; the clone's hooks folder gets a small shim that runs
// the prepare-commit-msg hook it replaced first. When a hook manager owns the hooks folder
// (core.hooksPath — husky, lefthook), we don't write into it; we say which line to add.

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { VERSION } from "./version";

export const MERGE_KEY = "madeby.merge";
const MARK = "madeby merge hook";
const CHAINED = "prepare-commit-msg.madeby-chained";

export type MergeCategory = "human" | "with_ai" | "ai";
export interface MergeDeclaration {
  category: MergeCategory;
  /** the disclosed AI value (tool, or tool:model) for with_ai / ai */
  tool?: string;
}

/** The config value for a declaration: `human`, `with_ai:<tool>` or `ai:<tool>`. */
export function mergeValue(d: MergeDeclaration): string {
  return d.category === "human" ? "human" : `${d.category}:${d.tool || "AI"}`;
}

/** Parse a config value back; null when it isn't one we wrote. */
export function parseMergeValue(v: string): MergeDeclaration | null {
  const s = v.trim();
  if (s === "human") return { category: "human" };
  const m = /^(with_ai|ai):(.+)$/.exec(s);
  return m ? { category: m[1] as MergeCategory, tool: m[2]!.trim() || "AI" } : null;
}

// The script. Plain sh, so a commit needs no Node. The disclosure patterns are kept in sync with
// core's recognizers (HUMAN_ATTEST_RE, AI_AUTHOR_RE, AI_TRAILER_RE + AI_MARKER_RE).
const SCRIPT = `#!/bin/sh
# ${MARK} (madeby ${VERSION}, https://madeby.fyi). On a merge you finish in this clone, adds the
# disclosure you declared with \`madeby me --merges\` (git config ${MERGE_KEY}). It never guesses: with no
# declaration it offers commented-out lines when an editor opens, and adds nothing otherwise.
msg="$1"
[ -n "$msg" ] && [ -f "$msg" ] || exit 0
mh=$(git rev-parse --git-path MERGE_HEAD)
[ -f "$mh" ] || exit 0

# a message that already says who wrote it wins (an agent's own trailer, for example)
if grep -v '^#' "$msg" | grep -Eiq '^[[:space:]]*(Authored-by-human|Human-authored(-by)?|Authored-by-ai)[[:space:]]*:'; then exit 0; fi
if grep -v '^#' "$msg" | grep -Ei '^[[:space:]]*(Co-authored-by|Generated-by|Assisted-by)[[:space:]]*:' | grep -Eiq '(^|[^a-z0-9])(claude|copilot|cursor|cursoragent|devin|gemini|chatgpt|openai|codex|gpt-|codeium|windsurf|aider|codewhisperer|tabnine)'; then exit 0; fi

# a clean merge has no changes of its own and isn't scored, so it needs nothing (git 2.38+ can tell)
if [ "$(wc -l < "$mh" | tr -d ' ')" = 1 ]; then
  auto=$(git merge-tree --write-tree HEAD MERGE_HEAD 2>/dev/null) && [ "$(printf '%s\\n' "$auto" | head -n 1)" = "$(git write-tree 2>/dev/null)" ] && exit 0
fi

name=$(git config user.name); email=$(git config user.email)
decl=$(git config --get ${MERGE_KEY})
case "$decl" in
  human) lines="Authored-by-human: $name <$email>" ;;
  with_ai:*) lines="Authored-by-human: $name <$email>
Assisted-by: \${decl#with_ai:}" ;;
  ai:*) lines="Authored-by-ai: \${decl#ai:}" ;;
  *)
    # no declaration: offer the lines, only where an editor will show them (git sets GIT_EDITOR=: when none opens)
    [ "$GIT_EDITOR" = ":" ] && exit 0
    lines="# Who resolved this merge? Uncomment what's true (https://madeby.fyi):
#Authored-by-human: $name <$email>
#Assisted-by: <your AI tool>
# Or say it once for every merge: npx madeby me --merges (add --with-ai <tool> if you use one)" ;;
esac

# the disclosure goes in its own paragraph, before git's commented lines
tmp="$msg.madeby"
MADEBY_LINES="$lines" awk 'BEGIN { done = 0; add = ENVIRON["MADEBY_LINES"] }
  !done && /^#/ { print ""; print add; print ""; done = 1 }
  { print }
  END { if (!done) { print ""; print add } }' "$msg" > "$tmp" && mv "$tmp" "$msg"
exit 0
`;

const shim = (script: string): string => `#!/bin/sh
# ${MARK} — runs the prepare-commit-msg hook it replaced, then madeby's (installed by madeby init --hooks).
d=$(dirname "$0")
if [ -x "$d/${CHAINED}" ]; then "$d/${CHAINED}" "$@" || exit $?; fi
[ -f "${script}" ] && sh "${script}" "$@"
exit 0
`;

export interface HookInstall {
  /** installed: in the hooks folder; chained: installed, and an earlier hook still runs first; managed: a hook manager owns the folder — add `line` to its prepare-commit-msg */
  status: "installed" | "chained" | "managed" | "updated";
  script: string;
  /** for `managed`: the line to add to the manager's prepare-commit-msg */
  line?: string;
}

const git = (root: string, args: string[]): string => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

/** Install (or refresh) the merge hook in this clone. Idempotent; chains an existing hook. */
export function installMergeHook(root: string): HookInstall {
  const common = resolve(root, git(root, ["rev-parse", "--git-common-dir"]));
  const script = join(common, "madeby", "prepare-commit-msg");
  mkdirSync(join(common, "madeby"), { recursive: true });
  writeFileSync(script, SCRIPT);
  chmodSync(script, 0o755);

  let managed = "";
  try {
    managed = git(root, ["config", "--get", "core.hooksPath"]);
  } catch {
    /* unset: git uses <common>/hooks */
  }
  const portable = script.split("\\").join("/");
  if (managed) return { status: "managed", script, line: `sh "${portable}" "$@"` };

  const hooks = join(common, "hooks");
  mkdirSync(hooks, { recursive: true });
  const hook = join(hooks, "prepare-commit-msg");
  let status: HookInstall["status"] = "installed";
  if (existsSync(hook)) {
    if (readFileSync(hook, "utf8").includes(MARK)) status = existsSync(join(hooks, CHAINED)) ? "chained" : "updated";
    else {
      renameSync(hook, join(hooks, CHAINED));
      status = "chained";
    }
  }
  writeFileSync(hook, shim(portable));
  chmodSync(hook, 0o755);
  return { status, script };
}

/** Save the standing declaration in this clone's git config and install the hook. */
export function declareMerges(root: string, d: MergeDeclaration): HookInstall {
  execFileSync("git", ["-C", root, "config", MERGE_KEY, mergeValue(d)]);
  return installMergeHook(root);
}

/** Clear the declaration. The hook stays; with no declaration it only offers lines in the editor. */
export function clearMerges(root: string): void {
  try {
    execFileSync("git", ["-C", root, "config", "--unset", MERGE_KEY], { stdio: "ignore" });
  } catch {
    /* already unset */
  }
}

/** Print what an install did, for `me` / `ai` / `init`. */
export function renderHookInstall(h: HookInstall): string {
  if (h.status === "managed")
    return `Your hooks folder is managed by another tool (git config core.hooksPath), so madeby didn't write into it.\n  Add this line to its prepare-commit-msg hook:  ${h.line}`;
  const chained = h.status === "chained" ? " Your existing prepare-commit-msg hook still runs first." : "";
  return `Merge hook ${h.status === "updated" ? "refreshed" : "installed"} in this clone.${chained} Each developer installs it once in their own clone.`;
}

/** Shared by `me` and `ai`: `--merges` (declare), `--merges off` (clear). Returns true when handled. */
export function mergesFlag(cmd: string, root: string, args: string[], d: MergeDeclaration): boolean {
  const i = args.indexOf("--merges");
  if (i === -1) return false;
  if (args[i + 1] === "off") {
    clearMerges(root);
    console.log(`madeby ${cmd}: merge declaration cleared. The hook stays; in the editor it offers the lines for you to uncomment.`);
    return true;
  }
  const h = declareMerges(root, d);
  const said = d.category === "human" ? "you resolve them yourself" : d.category === "with_ai" ? `you resolve them with ${d.tool}` : `${d.tool} resolves them`;
  console.log(
    `madeby ${cmd}: merges you finish in this clone will say ${said} (${MERGE_KEY}=${mergeValue(d)}).\n` +
      `  ${renderHookInstall(h)}\n` +
      "  Only merges with changes of their own, and only when the message doesn't already say who wrote it.\n" +
      "  Merges resolved in the host's web UI don't run local hooks — disclose those with --for. To stop: --merges off.",
  );
  return true;
}
