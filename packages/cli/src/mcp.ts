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
import { recognizeCommits, evaluateRepoDisclosure, listHostAdapters, getHostAdapter, resolveIdentity } from "@madeby/analyzer";

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

interface Tool {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: Record<string, unknown>) => unknown;
}

const TOOLS: Tool[] = [
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
          capabilities: { tools: {} },
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
  process.stderr.write("madeby mcp: ready (stdio, MCP tools: recognize, check, list_host_adapters, resolve_identity)\n");
}
