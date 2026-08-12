// `madeby mcp` — an agent-native MCP server (ARCHITECTURE §12). It exposes MadeBy's primitives as
// tools an AI agent calls, over the Model Context Protocol's stdio transport (newline-delimited
// JSON-RPC 2.0). Dependency-free — the same self-contained posture as the rest of the CLI; we
// implement the small, stable stdio surface directly rather than pull a runtime.
//
// Contract discipline: stdout carries ONLY protocol messages (anything else corrupts the stream), so
// all logging goes to stderr. Tool handlers return plain data; a thrown error becomes an isError tool
// result (the agent sees it) rather than a transport error. The tools are the same primitives the CLI
// and any third party compose — an agent gets the identical, invariant-capped surface.

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { evaluateRepoDisclosure, proveRepo, provenanceOf, provenanceMap } from "@madeby/analyzer";
import { initRepo } from "./init-repo";

const DEFAULT_PROTOCOL = "2024-11-05";
const SERVER_INFO = { name: "madeby", version: "0.1.0" };

/** Resolve a repo root from a path arg (default: the server's cwd). Throws if not a git repo. */
function rootFor(path?: string): string {
  const cwd = path && path.length ? path : process.cwd();
  return execFileSync("git", ["-C", cwd, "-c", "core.quotePath=false", "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

const repoInput = {
  type: "object",
  properties: {
    path: { type: "string", description: "path to the repo (default: the server's working directory)" },
    range: { type: "string", description: "git commit range, e.g. origin/main..HEAD (default: recent history)" },
  },
} as const;

type InitMode = "off" | "advisory" | "required";

interface Tool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: Record<string, unknown>) => unknown;
}

const TOOLS: Tool[] = [
  {
    name: "init",
    description:
      "Align a repository with MadeBy in one call: create .madeby/policy.json (advisory by default — " +
      "reports, never fails) and the CI disclosure check for the host (github default; azure-devops " +
      "guided). Idempotent — never clobbers an existing policy or workflow. Returns the files " +
      "created/skipped and the recommended next steps. Read the resources: madeby://guide/align (full " +
      "workflow), madeby://guide/enforce (make the check required — the host's control plane, exact " +
      "commands), madeby://guide/backfill (account for existing history honestly — never fabricate).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "path to the repo (default: the server's working directory)" },
        mode: { enum: ["off", "advisory", "required"], description: "policy mode to seed (default: advisory)" },
        host: { type: "string", description: "CI host to wire: github (default) or azure-devops" },
      },
    },
    handler: (args) => initRepo(rootFor(args.path as string | undefined), { mode: args.mode as InitMode | undefined, host: args.host as string | undefined }),
  },
  {
    name: "check",
    description:
      "Evaluate a repo's commits against its .madeby/policy.json disclosure policy (the maintainer " +
      "gate). Returns pass/fail, the policy mode, and the undisclosed commits. Fail-safe: a missing or " +
      "invalid policy degrades to 'off' (never a false gate).",
    inputSchema: repoInput,
    handler: (args) => evaluateRepoDisclosure(rootFor(args.path as string | undefined), { range: args.range as string | undefined }),
  },
  {
    name: "who",
    description:
      "Made by whom? Read what's ON THE RECORD about who made this. With `path`: one file's origin — " +
      "witnessed AI spans (model/tool, precise) where captured, last-touch commit disclosure from git " +
      "blame elsewhere (approximate, labeled), unknown otherwise. With no `path`: a repo-wide map (the " +
      "orientation to read BEFORE you work) — the witnessed AI surface plus commit-level disclosure " +
      "coverage, cheap (no per-file blame). The universal contract is the line range: for a symbol, " +
      "turn it into a line range with your own tooling (tree-sitter/LSP/ctags) and pass it — MadeBy " +
      "never parses code. Disclosure, not detection: it reports what's disclosed and never asserts 'human'.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "repo-relative file to read one file's origin (omit for a repo-wide map)" },
        repo: { type: "string", description: "path to the repo (default: the server's working directory)" },
        startLine: { type: "number", description: "with `path`: optional 1-based start of a line range" },
        endLine: { type: "number", description: "with `path`: optional 1-based end of a line range" },
        prefix: { type: "string", description: "map only: limit to a path prefix, e.g. src/" },
        commitLimit: { type: "number", description: "map only: recent commits to include in the coverage figure (default 500)" },
      },
    },
    handler: (args) =>
      args.path
        ? provenanceOf(rootFor(args.repo as string | undefined), args.path as string, {
            startLine: args.startLine as number | undefined,
            endLine: args.endLine as number | undefined,
          })
        : provenanceMap(rootFor(args.repo as string | undefined), { prefix: args.prefix as string | undefined, commitLimit: args.commitLimit as number | undefined }),
  },
  {
    name: "ai",
    description:
      "Made by AI (WRITE): record witnessed AI-authorship spans from YOUR OWN session log into the " +
      "repo's .madeby/spans (asserted tier, self-reported) — how an agent DISCLOSES its own " +
      "contribution. Honest by construction: it records only spans whose AI-authored content is " +
      "STRUCTURALLY PRESENT in the checkout (survives reformatting); anything not present is discarded. " +
      "Writes only derived attribution, locally — the log/content never leave the machine. It cannot " +
      "claim a higher tier or attribute work to anyone else.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "path to the repo (default: the server's working directory)" },
        log: { type: "string", description: "session transcript path (default: auto-discover the Claude Code transcript)" },
        ref: { type: "string", description: "commit the spans anchor to (default: HEAD)" },
      },
    },
    handler: (args) => proveRepo(rootFor(args.path as string | undefined), { transcriptPath: args.log as string | undefined, ref: args.ref as string | undefined }),
  },
];

// Resources make the server self-teaching: an agent can read the workflow + the policy schema, so it
// discovers HOW to align a repo, not just which verbs exist (ARCHITECTURE §12, agent-native).
const ALIGN_GUIDE = `# Aligning a repository with MadeBy

MadeBy is **disclosure, not detection** — it records what a commit *states* about its origin, never
guesses whether code is AI. To align a repo:

1. **Assess** — call \`check\` (or \`who\` with no path for a repo-wide map) to see current coverage.
2. **Set up** — call \`init\`: it writes \`.madeby/policy.json\` (advisory) and the CI disclosure check.
   Idempotent; it never clobbers an existing policy or workflow. Then commit the created files.
3. **Disclose going forward** — contributors disclose origin with a Co-Authored-By / Generated-by
   trailer (AI), an \`Authored-by-human\` trailer (work they wrote themselves — the symmetric human
   claim; \`madeby me\` adds it), a DCO Signed-off-by, a signed commit, or \`ai\` (record your own AI
   session's witnessed spans, structurally verified and local). Human and AI disclosure ride the same ladder.
4. **Account for existing history honestly** — do NOT fabricate disclosure for past commits. Read the
   \`madeby://guide/backfill\` resource: recognize what's already disclosed, attach recoverable
   evidence, and set an adoption boundary — pre-boundary history is labeled *unknown*, never invented.
5. **Enforce when ready** — set the policy mode to \`required\`, then make the check required on the
   protected branch. That last step is the host's control plane (your credentials), so MadeBy doesn't
   do it for you — the exact commands are in the \`madeby://guide/enforce\` resource.
6. **Verify** — call \`check\` again.

Nothing is hosted; nothing leaves the CI. The maintainer owns the policy.
`;

const ENFORCE_GUIDE = `# Enforcing the MadeBy disclosure check

MadeBy sets the policy (mode: required) but does NOT change your repository's protection settings —
that needs your credentials and is the host's control plane, so you (or an agent acting as you) make
the check required. MadeBy deliberately keeps this an explicit, reviewable action.

## GitHub (needs repo admin + the gh CLI, authenticated)

1. Set the policy to required (or run: madeby init --required):
   in .madeby/policy.json set "mode": "required".
2. Find the check's name: open any pull request and read the Checks tab. For the generated workflow
   the job name is "madeby".
3. Add it as a required status check on the protected branch (e.g. main). If protection already
   exists, add the context:

       echo '["madeby"]' | gh api -X POST \\
         repos/OWNER/REPO/branches/main/protection/required_status_checks/contexts --input -

   If the branch has no protection yet, create it with a required_status_checks block that lists
   "madeby" (PUT repos/OWNER/REPO/branches/main/protection --input protection.json).

Confirm against the GitHub REST docs for "branch protection" and verify with the actual check name
from a PR.

## Azure DevOps (build validation branch policy)

Project Settings -> Repositories -> (repo) -> Policies -> Branch (main) -> Build Validation -> Add:
point it at the pipeline that includes azure-pipelines-disclosure.yml; set trigger automatic and
required. CLI equivalent: az repos policy build create ... --branch main --blocking true.
`;

const BACKFILL_GUIDE = `# Honest backfill for an existing repo

You cannot retroactively disclose past commits by inventing origin — that is fabrication, and MadeBy
refuses it. But you CAN make an honest, verifiable statement about history. Backfill in layers, and
never raise a commit's origin above its evidence — unknown stays unknown, just explicitly so.

1. **Recognize what's already there** (free, pure evidence). Run \`check\` over FULL history:
   existing Co-Authored-By AI trailers, DCO Signed-off-by, signed commits, and bot authorship are
   recognized now even though they predate adoption. Much of your history may already be disclosed.

2. **Attach recoverable evidence** (opt-in, evidence-grade):
   - Old AI-tool session logs -> \`ai\` attaches structurally-verified spans to their commits (it
     only matches content actually present, so it cannot over-claim). Pass the transcript + the ref.
   - Committed AI-tool configs (.cursor/, CLAUDE.md, ...) are repo-level evidence the repo used AI.

3. **Set the adoption boundary** (the watermark). The commit that introduced .madeby/policy.json is
   your dated adoption boundary:

       git log --diff-filter=A --format=%H -- .madeby/policy.json | tail -1

   Report coverage RELATIVE to it: commits after the boundary are in-regime and measured; commits
   before are UNKNOWN-origin (never "human", never "AI") unless independently disclosed by step 1/2.
   This makes the gap explicit and dated instead of hidden.

4. **Optionally self-attest** what you can stand behind (asserted tier). The author may assert
   specific pre-boundary facts they honestly know ("I solo-authored the initial import"; "vendor/ is
   third-party"). It is labeled self-reported (asserted) — never proof — and is contestable.

The invariant: backfill adds only evidence you can point to, or an explicitly-labeled assertion; it
never fabricates disclosure or upgrades origin beyond its evidence.
`;

const POLICY_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: ".madeby/policy.json",
  type: "object",
  required: ["version", "mode"],
  properties: {
    version: { const: 0 },
    mode: { enum: ["off", "advisory", "required"], description: "off: no gate; advisory: report only; required: fail on any undisclosed commit" },
    accept: { type: "array", items: { type: "string" }, description: "restrict what satisfies the policy (e.g. dco-signoff, ai-trailer, commit-signature); omit ⇒ any recognized disclosure counts" },
  },
};

const RESOURCES = [
  { uri: "madeby://guide/align", name: "Aligning a repo with MadeBy", description: "The step-by-step workflow to align a repository (for humans and agents).", mimeType: "text/markdown", text: ALIGN_GUIDE },
  { uri: "madeby://guide/enforce", name: "Enforcing the disclosure check", description: "How to make the check required on a protected branch (GitHub / Azure DevOps) — the host's control plane, exact commands.", mimeType: "text/markdown", text: ENFORCE_GUIDE },
  { uri: "madeby://guide/backfill", name: "Honest backfill for existing repos", description: "How to account for pre-adoption history honestly — recognize, attach evidence, set a boundary; never fabricate.", mimeType: "text/markdown", text: BACKFILL_GUIDE },
  { uri: "madeby://schema/policy", name: ".madeby/policy.json schema", description: "JSON Schema for the disclosure policy file.", mimeType: "application/json", text: JSON.stringify(POLICY_SCHEMA, null, 2) },
];

interface RpcMessage {
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

function send(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function handle(msg: RpcMessage): void {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: (params?.protocolVersion as string | undefined) ?? DEFAULT_PROTOCOL,
          capabilities: { tools: {}, resources: {} },
          serverInfo: SERVER_INFO,
        },
      });
      return;
    case "notifications/initialized":
    case "notifications/cancelled":
      return; // notifications get no response
    case "ping":
      send({ jsonrpc: "2.0", id, result: {} });
      return;
    case "tools/list":
      send({ jsonrpc: "2.0", id, result: { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) } });
      return;
    case "resources/list":
      send({ jsonrpc: "2.0", id, result: { resources: RESOURCES.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType })) } });
      return;
    case "resources/read": {
      const found = RESOURCES.find((r) => r.uri === params?.uri);
      if (!found) {
        send({ jsonrpc: "2.0", id, error: { code: -32602, message: `unknown resource: ${String(params?.uri)}` } });
        return;
      }
      send({ jsonrpc: "2.0", id, result: { contents: [{ uri: found.uri, mimeType: found.mimeType, text: found.text }] } });
      return;
    }
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) {
        send({ jsonrpc: "2.0", id, error: { code: -32602, message: `unknown tool: ${String(params?.name)}` } });
        return;
      }
      try {
        const out = tool.handler((params?.arguments as Record<string, unknown>) ?? {});
        send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] } });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `error: ${message}` }], isError: true } });
      }
      return;
    }
    default:
      if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${String(method)}` } });
  }
}

/** Start the stdio MCP server. Runs until stdin closes. */
export function startMcpServer(): void {
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: RpcMessage;
    try {
      msg = JSON.parse(trimmed) as RpcMessage;
    } catch {
      return; // ignore non-JSON noise on stdin
    }
    handle(msg);
  });
  process.stderr.write("madeby mcp: ready (stdio; tools: init, check, who, ai; resources: align/enforce/backfill guides, policy schema)\n");
}
