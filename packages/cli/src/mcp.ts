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
import { recognizeCommits, evaluateRepoDisclosure, proveRepo, listHostAdapters, getHostAdapter, resolveIdentity } from "@madeby/analyzer";
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
      "created/skipped and the recommended next steps (including that history is NOT backfilled — " +
      "disclosure is going-forward). Read the madeby://guide/align resource for the full workflow.",
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
    name: "recognize",
    description:
      "The raw disclosure primitive: for each commit, which disclosure signals it carries " +
      "(AI-authorship trailer, DCO Signed-off-by, commit signature) — NO policy applied. Disclosure, " +
      "never detection: it reports what a commit states about its origin, never guesses whether code is AI.",
    inputSchema: repoInput,
    handler: (args) => {
      const rows = recognizeCommits(rootFor(args.path as string | undefined), { range: args.range as string | undefined });
      return {
        commits: rows.map((r) => ({
          sha: r.sha.slice(0, 8),
          subject: r.subject,
          disclosed: r.disclosures.length > 0,
          disclosures: r.disclosures,
        })),
      };
    },
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
    name: "prove",
    description:
      "WRITE: record witnessed AI-authorship spans from YOUR OWN session log into the repo's " +
      ".madeby/spans (asserted tier, self-reported) — how an agent DISCLOSES its own contribution. " +
      "Honest by construction: it records only spans whose AI-authored content is STRUCTURALLY PRESENT " +
      "in the checkout (survives reformatting); anything not present is discarded. Writes only derived " +
      "attribution, locally — the log/content never leave the machine. It cannot claim a higher tier " +
      "or attribute work to anyone else.",
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
  {
    name: "list_host_adapters",
    description:
      "List the forge host adapters MadeBy knows (GitHub, Azure DevOps, …) and which capabilities each " +
      "implements — handle-from-email, public profile URL, API handle/profile resolution, CI-range " +
      "auto-detection. Use it to discover which hosts are turnkey; any other host is supported by " +
      "composing `check` with a range you compute yourself.",
    inputSchema: { type: "object", properties: {} },
    handler: () => ({
      adapters: listHostAdapters().map((a) => ({
        id: a.id,
        name: a.name,
        capabilities: {
          handleFromEmail: typeof a.handleFromEmail === "function",
          profileUrl: typeof a.profileUrl === "function",
          resolveHandleViaApi: typeof a.resolveHandleViaApi === "function",
          fetchProfile: typeof a.fetchProfile === "function",
          ciRange: typeof a.ciRange === "function",
        },
      })),
    }),
  },
  {
    name: "resolve_identity",
    description:
      "Resolve a git committer (name/email) to a stable identity key and, where the host encodes it in " +
      "the commit email, a public handle. Zero-network. Never deanonymizes a private email — absent a " +
      "publicly-linked handle the key falls back to the email.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        host: { type: "string", description: "host adapter id (default: github)" },
      },
    },
    handler: (args) => {
      const adapter = args.host ? getHostAdapter(args.host as string) : undefined;
      const id = resolveIdentity(args.name as string | undefined, args.email as string | undefined, adapter);
      return { key: id.key, handle: id.handle ?? null };
    },
  },
];

// Resources make the server self-teaching: an agent can read the workflow + the policy schema, so it
// discovers HOW to align a repo, not just which verbs exist (ARCHITECTURE §12, agent-native).
const ALIGN_GUIDE = `# Aligning a repository with MadeBy

MadeBy is **disclosure, not detection** — it records what a commit *states* about its origin, never
guesses whether code is AI. To align a repo:

1. **Assess** — call \`check\` (or \`recognize\`) to see the current disclosure coverage.
2. **Set up** — call \`init\`: it writes \`.madeby/policy.json\` (advisory) and the CI disclosure check.
   Idempotent; it never clobbers an existing policy or workflow. Then commit the created files.
3. **Disclose going forward** — contributors disclose origin with a Co-Authored-By / Generated-by
   trailer, a DCO Signed-off-by, a signed commit, or \`prove\` (record your own AI session's witnessed
   spans, structurally verified and local).
4. **Enforce when ready** — set the policy mode to \`required\` and add the check to the branch
   protection / build-validation rule (this last step is the host's setting, not a MadeBy tool).
5. **Verify** — call \`check\` again.

Notes:
- **Historical commits are not backfilled** — disclosure applies going forward. Do not fabricate
  disclosure for past work.
- Nothing is hosted; nothing leaves the CI. The maintainer owns the policy.
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
  process.stderr.write("madeby mcp: ready (stdio; tools: init, recognize, check, prove, list_host_adapters, resolve_identity; resources: align guide, policy schema)\n");
}
