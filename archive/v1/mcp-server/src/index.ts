#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment
const BASE_URL = process.env.MADEBY_API_URL || "https://madeby.fyi";
const API_KEY = process.env.MADEBY_API_KEY;

if (!API_KEY) {
  console.error("Error: MADEBY_API_KEY environment variable is required");
  process.exit(1);
}

// API client helper
async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `API Error (${response.status}): ${(data as { error?: string }).error || "Unknown error"}`
    );
  }

  return data;
}

// Tool definitions
const tools: Tool[] = [
  {
    name: "list_representations",
    description:
      "List all available legal representations that can be attached to content declarations. Returns STANDARD (good-faith assertion) and PERJURY (Gold Standard - under penalty of perjury with digital signature).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_declaration",
    description:
      "Create a new content declaration with a badge indicating whether content was made by humans (HUMAN), AI (AI), or with AI assistance (WITH_AI). Optionally attach a legal representation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title of the content",
        },
        creatorName: {
          type: "string",
          description: "Name of the creator",
        },
        contentType: {
          type: "string",
          enum: ["HUMAN", "AI", "WITH_AI"],
          description:
            "Type of content: HUMAN (100% human-made), AI (AI-generated), WITH_AI (human-AI collaboration)",
        },
        description: {
          type: "string",
          description: "Optional description of the content",
        },
        originalUrl: {
          type: "string",
          description: "Optional URL where the original content is hosted",
        },
        representationCode: {
          type: "string",
          enum: ["STANDARD", "PERJURY"],
          description:
            "Optional legal representation: STANDARD (good-faith) or PERJURY (Gold Standard with signature)",
        },
        signatureName: {
          type: "string",
          description:
            "Required for PERJURY representation: typed full legal name as digital signature",
        },
        contentHash: {
          type: "string",
          description: "Optional cryptographic hash of the content (hex-encoded)",
        },
        hashAlgorithm: {
          type: "string",
          enum: ["SHA256", "SHA384", "SHA512", "SHA3_256", "SHA3_512", "BLAKE2B", "BLAKE3"],
          description: "Hash algorithm used (default: SHA256)",
        },
        gitCommitHash: {
          type: "string",
          description: "Optional git commit SHA for version-controlled content",
        },
        gitRepositoryUrl: {
          type: "string",
          description: "Optional URL to the git repository",
        },
      },
      required: ["title", "creatorName", "contentType"],
    },
  },
  {
    name: "list_declarations",
    description:
      "List the authenticated user's content declarations with pagination.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of results (default: 50, max: 100)",
        },
        offset: {
          type: "number",
          description: "Pagination offset (default: 0)",
        },
        contentType: {
          type: "string",
          enum: ["HUMAN", "AI", "WITH_AI"],
          description: "Filter by content type",
        },
      },
      required: [],
    },
  },
  {
    name: "get_declaration",
    description:
      "Get a specific content declaration by ID, including its legal representation if attached.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The declaration ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_declaration",
    description:
      "Update an existing content declaration. Only the owner can update their declarations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The declaration ID to update",
        },
        title: {
          type: "string",
          description: "New title",
        },
        description: {
          type: "string",
          description: "New description",
        },
        contentType: {
          type: "string",
          enum: ["HUMAN", "AI", "WITH_AI"],
          description: "New content type",
        },
        creatorName: {
          type: "string",
          description: "New creator name",
        },
        originalUrl: {
          type: "string",
          description: "New original URL",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_declaration",
    description:
      "Delete a content declaration. Only the owner can delete their declarations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The declaration ID to delete",
        },
      },
      required: ["id"],
    },
  },
];

// Tool handlers
async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "list_representations": {
      const data = await apiRequest("GET", "/api/representations");
      return JSON.stringify(data, null, 2);
    }

    case "create_declaration": {
      const data = await apiRequest("POST", "/api/content", args);
      return JSON.stringify(data, null, 2);
    }

    case "list_declarations": {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", String(args.limit));
      if (args.offset) params.set("offset", String(args.offset));
      if (args.contentType) params.set("contentType", String(args.contentType));

      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiRequest("GET", `/api/content${query}`);
      return JSON.stringify(data, null, 2);
    }

    case "get_declaration": {
      const data = await apiRequest("GET", `/api/content/${args.id}`);
      return JSON.stringify(data, null, 2);
    }

    case "update_declaration": {
      const { id, ...updateData } = args;
      const data = await apiRequest("PATCH", `/api/content/${id}`, updateData);
      return JSON.stringify(data, null, 2);
    }

    case "delete_declaration": {
      const data = await apiRequest("DELETE", `/api/content/${args.id}`);
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create and run server
async function main() {
  const server = new Server(
    {
      name: "madeby-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, (args as Record<string, unknown>) || {});
      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MadeBy MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
