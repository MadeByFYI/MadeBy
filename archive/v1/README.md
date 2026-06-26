# MadeBy

Content attribution web application for declaring and verifying the origin of digital content.

## Setup

### Prerequisites

- Node.js 24+
- PostgreSQL database

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Database

Run Prisma migrations:

```bash
npx prisma migrate dev
```

### Development

```bash
npm run dev
```

## Google OAuth Configuration

To enable "Sign in with Google":

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Select **External** user type (or Internal for Google Workspace)
3. Fill in the required fields:
   - App name: `MadeBy`
   - User support email: your email
   - Developer contact email: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if in testing mode

### 3. Create OAuth Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Configure:
   - Name: `MadeBy Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
5. Click **Create**

### 4. Add Credentials to Environment

Copy the Client ID and Client Secret to your `.env` file:

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 5. Restart the Server

Restart the development server to load the new environment variables:

```bash
npm run dev
```

The "Sign in with Google" button on `/auth/signin` should now work.

## Microsoft OAuth Configuration

To enable "Sign in with Microsoft":

### 1. Register an Application in Azure

1. Go to [Azure Portal - App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
3. Configure:
   - Name: `MadeBy`
   - Supported account types: Select based on your needs:
     - **Personal Microsoft accounts only** - for consumer apps
     - **Accounts in any organizational directory and personal Microsoft accounts** - for broadest access
     - **Accounts in this organizational directory only** - for single-tenant enterprise apps
   - Redirect URI: Select **Web** and enter:
     - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (development)
4. Click **Register**

### 2. Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Web > Redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (development)
   - `https://yourdomain.com/api/auth/callback/microsoft-entra-id` (production)
3. Under **Implicit grant and hybrid flows**, check:
   - **ID tokens**
4. Click **Save**

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "MadeBy Auth")
4. Select expiration period
5. Click **Add**
6. **Copy the secret value immediately** (it won't be shown again)

### 4. Get Application (Client) ID

1. Go to **Overview**
2. Copy the **Application (client) ID**

### 5. Add Credentials to Environment

Add to your `.env` file:

```env
MICROSOFT_CLIENT_ID="your-application-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret-value"
```

### 6. Restart the Server

Restart the development server to load the new environment variables:

```bash
npm run dev
```

The "Sign in with Microsoft" button on `/auth/signin` should now work.

## GitHub OAuth Configuration

To enable "Sign in with GitHub":

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** > **New OAuth App**
3. Configure:
   - Application name: `MadeBy`
   - Homepage URL: `http://localhost:3000` (development) or your production URL
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**

### 2. Get Client Credentials

1. After registration, you'll see the **Client ID**
2. Click **Generate a new client secret**
3. Copy the secret immediately (it won't be shown again)

### 3. Add Credentials to Environment

Add to your `.env` file:

```env
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

### 4. Update Callback URL for Production

When deploying, update the callback URL in your GitHub OAuth App settings:
- `https://yourdomain.com/api/auth/callback/github`

### 5. Restart the Server

Restart the development server to load the new environment variables:

```bash
npm run dev
```

The "Sign in with GitHub" button on `/auth/signin` should now work.

## Identity Verification Setup

The identity system supports optional verification for domains, email addresses, phone numbers, and mailing addresses. Each verification method requires setting up external services.

### Domain Verification (DNS)

Domain verification works out of the box using DNS TXT record lookups. No additional setup required.

**How it works:**
1. User adds a domain to their identity
2. System generates a unique verification token
3. User adds a TXT record to their DNS: `_madeby-verify.example.com` with value `madeby-verify={token}`
4. User clicks "Verify Now" and the system performs a DNS lookup
5. If the TXT record matches, the domain is marked as verified

### Email Verification (Resend)

To enable email verification:

#### 1. Create a Resend Account

1. Go to [Resend](https://resend.com/) and create an account
2. Verify your domain or use the sandbox for testing
3. Navigate to **API Keys** and create a new API key

#### 2. Install Resend SDK

```bash
npm install resend
```

#### 3. Add Environment Variables

```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
```

#### 4. Create Email Verification API Routes

Create `/api/verify/email/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emailId } = await request.json();

  const identityEmail = await prisma.identityEmail.findFirst({
    where: { id: emailId },
    include: { identity: true },
  });

  if (!identityEmail || identityEmail.identity.userId !== session.user.id) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const token = crypto.randomBytes(32).toString("hex");

  await prisma.identityEmail.update({
    where: { id: emailId },
    data: {
      verificationToken: token,
      verificationSentAt: new Date(),
      verified: "PENDING",
    },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/verify/email/confirm?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: identityEmail.email,
    subject: "Verify your email address - MadeBy",
    html: `
      <h1>Verify your email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  });

  return NextResponse.json({ success: true });
}
```

Create `/api/verify/email/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/settings/identity?error=invalid_token", request.url));
  }

  const email = await prisma.identityEmail.findFirst({
    where: { verificationToken: token },
  });

  if (!email) {
    return NextResponse.redirect(new URL("/settings/identity?error=invalid_token", request.url));
  }

  // Check if token is expired (24 hours)
  if (email.verificationSentAt) {
    const expiresAt = new Date(email.verificationSentAt.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.redirect(new URL("/settings/identity?error=token_expired", request.url));
    }
  }

  await prisma.identityEmail.update({
    where: { id: email.id },
    data: {
      verified: "VERIFIED",
      verifiedAt: new Date(),
      verificationToken: null,
    },
  });

  return NextResponse.redirect(new URL("/settings/identity/emails?verified=true", request.url));
}
```

### Phone Verification (Twilio)

To enable phone verification via SMS or voice call:

#### 1. Create a Twilio Account

1. Go to [Twilio](https://www.twilio.com/) and create an account
2. Get a phone number with SMS and Voice capabilities
3. Note your Account SID and Auth Token from the Console Dashboard

#### 2. Install Twilio SDK

```bash
npm install twilio
```

#### 3. Add Environment Variables

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"
```

#### 4. Create Phone Verification API Routes

Create `/api/verify/phone/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phoneId, method } = await request.json(); // method: "sms" or "call"

  const identityPhone = await prisma.identityPhone.findFirst({
    where: { id: phoneId },
    include: { identity: true },
  });

  if (!identityPhone || identityPhone.identity.userId !== session.user.id) {
    return NextResponse.json({ error: "Phone not found" }, { status: 404 });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.identityPhone.update({
    where: { id: phoneId },
    data: {
      verificationCode: code,
      verificationSentAt: new Date(),
      verificationAttempts: 0,
      verified: "PENDING",
    },
  });

  if (method === "call") {
    // Voice call with TTS
    await client.calls.create({
      to: identityPhone.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      twiml: `<Response><Say>Your MadeBy verification code is: ${code.split("").join(" ")}. I repeat: ${code.split("").join(" ")}.</Say></Response>`,
    });
  } else {
    // SMS
    await client.messages.create({
      to: identityPhone.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      body: `Your MadeBy verification code is: ${code}`,
    });
  }

  return NextResponse.json({ success: true, method });
}
```

Create `/api/verify/phone/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phoneId, code } = await request.json();

  const identityPhone = await prisma.identityPhone.findFirst({
    where: { id: phoneId },
    include: { identity: true },
  });

  if (!identityPhone || identityPhone.identity.userId !== session.user.id) {
    return NextResponse.json({ error: "Phone not found" }, { status: 404 });
  }

  // Check attempts (max 3)
  if (identityPhone.verificationAttempts >= 3) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  // Check expiry (10 minutes)
  if (identityPhone.verificationSentAt) {
    const expiresAt = new Date(identityPhone.verificationSentAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: "Code expired. Request a new code." }, { status: 410 });
    }
  }

  // Increment attempts
  await prisma.identityPhone.update({
    where: { id: phoneId },
    data: { verificationAttempts: { increment: 1 } },
  });

  if (identityPhone.verificationCode !== code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.identityPhone.update({
    where: { id: phoneId },
    data: {
      verified: "VERIFIED",
      verifiedAt: new Date(),
      verificationCode: null,
    },
  });

  return NextResponse.json({ verified: true });
}
```

### Mailing Address Verification (Lob)

To enable postal mail verification:

#### 1. Create a Lob Account

1. Go to [Lob](https://www.lob.com/) and create an account
2. Get your API key from the Settings page
3. Use the test API key for development (letters won't actually be sent)

#### 2. Install Lob SDK

```bash
npm install @lob/lob-typescript-sdk
```

#### 3. Add Environment Variables

```env
LOB_API_KEY="test_xxxxxxxxxxxxx"  # Use live_ prefix for production
```

#### 4. Create Address Verification API Routes

Create `/api/verify/address/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Configuration, LettersApi } from "@lob/lob-typescript-sdk";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const config = new Configuration({
  username: process.env.LOB_API_KEY,
});
const lettersApi = new LettersApi(config);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await prisma.identity.findUnique({
    where: { userId: session.user.id },
    include: { mailingAddress: true },
  });

  if (!identity?.mailingAddress) {
    return NextResponse.json({ error: "No address found" }, { status: 404 });
  }

  const address = identity.mailingAddress;

  // Generate 6-character alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await prisma.mailingAddress.update({
    where: { id: address.id },
    data: {
      verificationCode: code,
      verificationSentAt: new Date(),
      verified: "PENDING",
    },
  });

  // Send letter via Lob
  await lettersApi.create({
    to: {
      name: identity.displayName || "Resident",
      address_line1: address.street1,
      address_line2: address.street2 || undefined,
      address_city: address.city,
      address_state: address.state || undefined,
      address_zip: address.postalCode,
      address_country: address.country,
    },
    from: {
      name: "MadeBy Verification",
      address_line1: "Your Company Address",
      address_city: "Your City",
      address_state: "YS",
      address_zip: "12345",
      address_country: "US",
    },
    file: `<html>
      <body style="font-family: sans-serif; padding: 40px;">
        <h1>MadeBy Address Verification</h1>
        <p>Your verification code is:</p>
        <h2 style="font-size: 32px; letter-spacing: 4px; background: #f0f0f0; padding: 20px; text-align: center;">${code}</h2>
        <p>Enter this code at madeby.fyi/settings/identity/address to verify your address.</p>
      </body>
    </html>`,
  });

  return NextResponse.json({ success: true });
}
```

Create `/api/verify/address/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();

  const identity = await prisma.identity.findUnique({
    where: { userId: session.user.id },
    include: { mailingAddress: true },
  });

  if (!identity?.mailingAddress) {
    return NextResponse.json({ error: "No address found" }, { status: 404 });
  }

  const address = identity.mailingAddress;

  if (address.verificationCode !== code.toUpperCase()) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.mailingAddress.update({
    where: { id: address.id },
    data: {
      verified: "VERIFIED",
      verifiedAt: new Date(),
      verificationCode: null,
    },
  });

  return NextResponse.json({ verified: true });
}
```

### Environment Variables Summary

Add these to your `.env` file for full verification support:

```env
# Email Verification (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"

# Phone Verification (Twilio)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"

# Address Verification (Lob)
LOB_API_KEY="test_xxxxxxxxxxxxx"
```

## API Reference

MadeBy provides a REST API for programmatic content declaration management. Authentication is required for most endpoints.

### Authentication

The API supports two authentication methods:

1. **Session-based** - For browser clients using cookies
2. **API Key** - For programmatic access via `Authorization: Bearer <api_key>` header

To create an API key, visit `/settings/api-keys` in the web UI.

### Endpoints

#### Content Declarations

##### List Declarations
```
GET /api/content
```

Query parameters:
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `contentType` (optional): Filter by type (`HUMAN`, `AI`, `WITH_AI`)

Response:
```json
{
  "contents": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

##### Create Declaration
```
POST /api/content
```

Request body:
```json
{
  "title": "My Artwork",
  "creatorName": "Jane Doe",
  "contentType": "HUMAN",
  "description": "Optional description",
  "originalUrl": "https://example.com/artwork",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "attribution": "Optional attribution text",
  "collaborators": "Optional collaborators list",
  "aiToolsUsed": "Optional AI tools used (for WITH_AI type)",
  "owner": "Optional owner name",
  "contentHash": "sha256:abc123...",
  "hashAlgorithm": "SHA256",
  "hashTarget": "FILE",
  "hashInputSize": 1024,
  "hashInputFilename": "artwork.png",
  "gitCommitHash": "abc123def456",
  "gitRepositoryUrl": "https://github.com/user/repo",
  "representationCode": "STANDARD",
  "signatureName": "Jane Doe"
}
```

Required fields: `title`, `creatorName`, `contentType`

Content types:
- `HUMAN` - 100% human-created content
- `AI` - AI-generated content
- `WITH_AI` - Human-created with AI assistance

Response:
```json
{
  "id": "clxxx..."
}
```

##### Get Declaration
```
GET /api/content/{id}
```

Returns the full declaration including user info and legal representation acceptance.

##### Update Declaration
```
PATCH /api/content/{id}
```

Request body: Same fields as POST (all optional). Only the owner can update.

##### Delete Declaration
```
DELETE /api/content/{id}
```

Only the owner can delete.

#### Legal Representations

Legal representations are optional attestations users can attach to their declarations.

##### List Available Representations
```
GET /api/representations
```

Response:
```json
{
  "representations": [
    {
      "id": "clxxx...",
      "code": "STANDARD",
      "assertionLevel": "STANDARD",
      "name": "Standard Assertion",
      "shortDescription": "Best knowledge assertion",
      "assertionText": "I have applied the correct badge...",
      "fullLegalText": "LEGAL REPRESENTATION - STANDARD..."
    },
    {
      "id": "clyyy...",
      "code": "PERJURY",
      "assertionLevel": "PERJURY",
      "name": "Gold Standard Assertion",
      "shortDescription": "Under penalty of perjury + signature",
      "assertionText": "I have applied the correct badge...",
      "fullLegalText": "LEGAL REPRESENTATION - PERJURY..."
    }
  ]
}
```

##### Using Representations

When creating a declaration, include either:

- `representationId` - The database ID of the representation
- `representationCode` - The code string: `"STANDARD"` or `"PERJURY"`

For Gold Standard (PERJURY) representations, `signatureName` is required:

```json
{
  "title": "My Work",
  "creatorName": "Jane Doe",
  "contentType": "HUMAN",
  "representationCode": "PERJURY",
  "signatureName": "Jane Doe"
}
```

**Important:** MadeBy.fyi records that users created badges and associated them with legal representations. MadeBy.fyi does NOT assert that the declarations are true.

### Error Responses

All errors return JSON:
```json
{
  "error": "Error message"
}
```

Common status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (not the owner)
- `404` - Not found
- `500` - Server error

## Database Seeding

### Seed Legal Representations

Run the seed script to populate the legal representations:

```bash
npx ts-node prisma/seed-representations.ts
```

This creates/updates the two built-in representations:
- **Standard Assertion** - Basic good-faith declaration
- **Gold Standard Assertion** - Declaration under penalty of perjury with digital signature

## MCP Server for AI Agents

MadeBy includes an MCP (Model Context Protocol) server that allows AI agents like Claude to interact with the API.

### Installation

```bash
cd mcp-server
npm install
npm run build
```

### Configuration

Add to your Claude Desktop or Claude Code MCP settings:

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

### Available Tools

- `list_representations` - List available legal representations
- `create_declaration` - Create a content declaration
- `list_declarations` - List user's declarations
- `get_declaration` - Get a specific declaration
- `update_declaration` - Update a declaration
- `delete_declaration` - Delete a declaration

See [mcp-server/README.md](./mcp-server/README.md) for full documentation.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
