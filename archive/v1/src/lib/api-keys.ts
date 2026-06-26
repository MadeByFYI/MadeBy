import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./db";
import { auth } from "./auth";

// API key prefix for easy identification
const API_KEY_PREFIX = "mk_";

// Generate a cryptographically secure API key
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString("base64url");
  return `${API_KEY_PREFIX}${key}`;
}

// Hash an API key for secure storage
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Get the display prefix from a full key (first 12 chars including mk_)
export function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

// Validate API key format
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length > 20;
}

// Extract API key from request headers
export function extractApiKeyFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) return null;

  // Support "Bearer mk_xxx" format
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (isValidApiKeyFormat(token)) {
      return token;
    }
  }

  // Support "ApiKey mk_xxx" format
  if (authHeader.startsWith("ApiKey ")) {
    const token = authHeader.substring(7);
    if (isValidApiKeyFormat(token)) {
      return token;
    }
  }

  return null;
}

// Result type for authentication
export interface AuthResult {
  userId: string;
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  authMethod: "session" | "api_key";
  apiKeyId?: string;
}

// Validate an API key and return the associated user
export async function validateApiKey(key: string): Promise<AuthResult | null> {
  if (!isValidApiKeyFormat(key)) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  // Check if key is revoked
  if (apiKey.revokedAt) {
    return null;
  }

  // Check if key is expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {
    // Ignore errors updating last used
  });

  return {
    userId: apiKey.userId,
    user: apiKey.user,
    authMethod: "api_key",
    apiKeyId: apiKey.id,
  };
}

// Unified authentication: try session first, then API key
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | null> {
  // Try session auth first
  const session = await auth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      authMethod: "session",
    };
  }

  // Try API key auth
  const apiKey = extractApiKeyFromRequest(request);
  if (apiKey) {
    return await validateApiKey(apiKey);
  }

  return null;
}

// Create a new API key for a user
export async function createApiKey(
  userId: string,
  name: string,
  options?: {
    scopes?: string[];
    expiresAt?: Date;
  }
): Promise<{ key: string; id: string; keyPrefix: string }> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = getKeyPrefix(key);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix,
      scopes: options?.scopes ? JSON.stringify(options.scopes) : null,
      expiresAt: options?.expiresAt || null,
    },
  });

  // Return the full key only once - it cannot be retrieved later
  return {
    key,
    id: apiKey.id,
    keyPrefix,
  };
}

// Revoke an API key
export async function revokeApiKey(
  keyId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.apiKey.updateMany({
    where: {
      id: keyId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

// List a user's API keys (without the actual key values)
export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Delete an API key permanently
export async function deleteApiKey(
  keyId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.apiKey.deleteMany({
    where: {
      id: keyId,
      userId,
    },
  });

  return result.count > 0;
}
