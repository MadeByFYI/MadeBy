# CLAUDE.md - AI Assistant Context for MadeBy

This file provides context for AI assistants working on the MadeBy codebase.

## Project Overview

MadeBy is a content attribution web application for declaring and verifying the origin of digital content. Users can register content declarations indicating whether content is human-created, AI-generated, or created with AI assistance.

**Key Features:**
- Content declaration registration with badges (HUMAN, AI, WITH_AI)
- Legal representations (attestations) for declarations
- Cryptographic content hashing for verification
- Git commit tracking
- Identity management with verification (email, phone, domain, address)
- API key authentication for programmatic access
- OAuth authentication (Google, Microsoft, GitHub)

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM (v7.2.0)
- **Auth:** NextAuth v5 (beta)
- **Styling:** Tailwind CSS v4
- **Runtime:** Node.js 24+

## Directory Structure

```
/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed-representations.ts # Seed script for legal representations
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # NextAuth handlers
│   │   │   ├── content/      # Content CRUD endpoints
│   │   │   ├── identity/     # Identity management
│   │   │   ├── keys/         # API key management
│   │   │   ├── representations/ # Legal representations
│   │   │   └── verify/       # Verification endpoints
│   │   ├── dashboard/        # User dashboard
│   │   ├── declaration/[id]/ # Public declaration view
│   │   ├── docs/             # Documentation pages
│   │   ├── quick-start/      # Quick start guide
│   │   └── settings/         # User settings
│   ├── components/           # React components
│   ├── generated/prisma/     # Generated Prisma client
│   ├── lib/                  # Shared utilities
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── db.ts             # Prisma client instance
│   │   └── api-keys.ts       # API key utilities
│   └── types/                # TypeScript types
├── mcp-server/               # MCP server for AI agents
│   ├── src/index.ts          # MCP server implementation
│   └── dist/                 # Compiled output
└── public/                   # Static assets
```

## Database Models

### Core Models
- **User** - NextAuth user accounts
- **Content** - Content declarations with metadata, hashes, git info
- **Identity** - Public profiles with verification data

### Legal Representations
- **LegalRepresentation** - Predefined attestation templates (STANDARD, PERJURY)
- **RepresentationAcceptance** - Records of users accepting representations

### Verification
- **IdentityEmail**, **IdentityPhone**, **IdentityDomain**, **MailingAddress** - Contact info with verification status

### Content Attribution
- **ContentContributor** - Links identities to content with roles
- **AIAttestation** - Proof records for AI contributions
- **ContentProvenance** - C2PA/SynthID verification results

## Key Enums

```typescript
ContentType: HUMAN | AI | WITH_AI
AssertionLevel: STANDARD | PERJURY
HashAlgorithm: SHA256 | SHA384 | SHA512 | SHA3_256 | SHA3_512 | BLAKE2B | BLAKE3 | MD5
VerificationStatus: UNVERIFIED | PENDING | VERIFIED
```

## API Patterns

### Authentication
Routes use `authenticateRequest()` from `@/lib/api-keys` which supports:
1. Session-based auth (cookies)
2. API key auth (`Authorization: Bearer <key>`)

```typescript
const authResult = await authenticateRequest(request);
if (!authResult?.userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Response Format
Success: Return data directly or `{ id: "..." }` for creates
Error: `{ error: "Message" }` with appropriate status code

### Common Patterns
- Use Prisma transactions for multi-model operations
- Validate ownership before updates/deletes
- Return 403 for permission errors, 404 for not found

## Legal Representations

Two built-in representations:

1. **STANDARD** (code: "STANDARD")
   - Simple good-faith assertion
   - No signature required

2. **Gold Standard** (code: "PERJURY")
   - Declaration under penalty of perjury
   - Requires `signatureName` (typed full legal name)
   - Auto-captures signature date

API accepts either `representationId` or `representationCode`:
```json
{
  "representationCode": "PERJURY",
  "signatureName": "Jane Doe"
}
```

**Important:** MadeBy records that users created badges and associated them with representations. MadeBy does NOT assert declarations are true.

## Development Commands

```bash
# Start dev server
npm run dev

# Database operations
npx prisma db push          # Push schema changes (dev)
npx prisma migrate dev      # Create migration (production)
npx prisma generate         # Regenerate client

# Seed data
npx ts-node prisma/seed-representations.ts

# Build
npm run build
```

## Node.js Path

NVM is used. If npm/npx commands fail, use the full path:
```bash
export PATH="/Users/mackie/.nvm/versions/node/v24.12.0/bin:$PATH"
```

## Import Paths

- Use `@/` alias for src directory
- Prisma client: `@/generated/prisma/client`
- Lib utilities: `@/lib/db`, `@/lib/auth`, `@/lib/api-keys`

## Testing the API

```bash
# List representations
curl http://localhost:3000/api/representations

# Create content with legal representation
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Work",
    "creatorName": "Jane Doe",
    "contentType": "HUMAN",
    "representationCode": "STANDARD"
  }'

# Create with Gold Standard (requires signature)
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Work",
    "creatorName": "Jane Doe",
    "contentType": "HUMAN",
    "representationCode": "PERJURY",
    "signatureName": "Jane Doe"
  }'
```

## Common Tasks

### Adding a new API endpoint
1. Create route file in `src/app/api/<path>/route.ts`
2. Export handler functions (GET, POST, PATCH, DELETE)
3. Use `authenticateRequest()` for protected routes
4. Return `NextResponse.json()` with appropriate status

### Adding a new database model
1. Add model to `prisma/schema.prisma`
2. Run `npx prisma db push` (dev) or `npx prisma migrate dev` (prod)
3. Import types from `@/generated/prisma/client`

### Modifying the Legal Representations
1. Edit `prisma/seed-representations.ts`
2. Run `npx ts-node prisma/seed-representations.ts`
3. Existing acceptances retain their `legalTextSnapshot`

## MCP Server

The `mcp-server/` directory contains an MCP server for AI agents to interact with the API.

### Building
```bash
cd mcp-server
npm install
npm run build
```

### Configuration
Requires environment variable:
- `MADEBY_API_KEY` - API key from `/dashboard/api-keys`
- `MADEBY_API_URL` - (optional) defaults to `https://madeby.fyi`

### Available Tools
- `list_representations` - List legal representations
- `create_declaration` - Create content declaration
- `list_declarations` - List user's declarations
- `get_declaration` - Get specific declaration
- `update_declaration` - Update declaration
- `delete_declaration` - Delete declaration

### Claude Desktop/Code Config
```json
{
  "mcpServers": {
    "madeby": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "MADEBY_API_KEY": "mk_xxx"
      }
    }
  }
}
```

## Notes

- Optional verification dependencies (resend, twilio, lob) are dynamically imported
- Build may show warnings for missing optional deps - this is expected
- Prisma client is generated to `src/generated/prisma/` (non-standard location)
