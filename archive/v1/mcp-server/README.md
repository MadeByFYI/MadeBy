# MadeBy MCP Server

An MCP (Model Context Protocol) server that allows AI agents to interact with the MadeBy content attribution API.

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

The server requires the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `MADEBY_API_KEY` | Yes | Your MadeBy API key (get one at `/dashboard/api-keys`) |
| `MADEBY_API_URL` | No | API base URL (default: `https://madeby.fyi`) |

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "madeby": {
      "command": "node",
      "args": ["/path/to/MadeBy/mcp-server/dist/index.js"],
      "env": {
        "MADEBY_API_KEY": "mk_your_api_key_here"
      }
    }
  }
}
```

## Usage with Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "madeby": {
      "command": "node",
      "args": ["/path/to/MadeBy/mcp-server/dist/index.js"],
      "env": {
        "MADEBY_API_KEY": "mk_your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### `list_representations`

List all available legal representations.

**Parameters:** None

**Returns:** Array of legal representations (STANDARD and PERJURY/Gold Standard)

---

### `create_declaration`

Create a new content declaration with a badge.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | string | Yes | Title of the content |
| `creatorName` | string | Yes | Name of the creator |
| `contentType` | enum | Yes | `HUMAN`, `AI`, or `WITH_AI` |
| `description` | string | No | Description of the content |
| `originalUrl` | string | No | URL where content is hosted |
| `representationCode` | enum | No | `STANDARD` or `PERJURY` |
| `signatureName` | string | No* | Digital signature (*required for PERJURY) |
| `contentHash` | string | No | Cryptographic hash (hex) |
| `hashAlgorithm` | enum | No | SHA256, SHA512, BLAKE3, etc. |
| `gitCommitHash` | string | No | Git commit SHA |
| `gitRepositoryUrl` | string | No | Repository URL |

**Returns:** `{ id: "..." }` - The created declaration ID

---

### `list_declarations`

List the authenticated user's content declarations.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | number | No | Max results (default: 50, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |
| `contentType` | enum | No | Filter by HUMAN, AI, or WITH_AI |

**Returns:** `{ contents: [...], pagination: { total, limit, offset, hasMore } }`

---

### `get_declaration`

Get a specific content declaration by ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Declaration ID |

**Returns:** Full declaration object including legal representation if attached

---

### `update_declaration`

Update an existing content declaration (owner only).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Declaration ID to update |
| `title` | string | No | New title |
| `description` | string | No | New description |
| `contentType` | enum | No | New content type |
| `creatorName` | string | No | New creator name |
| `originalUrl` | string | No | New URL |

**Returns:** Updated declaration object

---

### `delete_declaration`

Delete a content declaration (owner only).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Declaration ID to delete |

**Returns:** `{ success: true }`

## Example Usage

Once configured, you can ask Claude to:

- "Create a content declaration for my new artwork titled 'Sunset Over Mountains' - it's 100% human-made"
- "List all my AI-generated content declarations"
- "Add a Gold Standard legal representation to declaration xyz123 with my signature 'John Doe'"
- "What legal representations are available for content declarations?"

## Development

```bash
# Watch mode for development
npm run dev

# Build
npm run build

# Run directly
MADEBY_API_KEY=mk_xxx npm start
```

## Content Types

| Type | Description |
|------|-------------|
| `HUMAN` | 100% human-created content |
| `AI` | AI-generated content |
| `WITH_AI` | Human-created with AI assistance |

## Legal Representations

| Code | Name | Description |
|------|------|-------------|
| `STANDARD` | Standard Assertion | Good-faith declaration, no signature required |
| `PERJURY` | Gold Standard | Under penalty of perjury, requires digital signature |

**Note:** MadeBy records that users created badges and associated them with legal representations. MadeBy does NOT assert that declarations are true.
