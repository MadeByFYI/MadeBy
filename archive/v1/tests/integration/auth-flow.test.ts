import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetPrismaMocks } from "../mocks/prisma";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Import after mocking
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  isValidApiKeyFormat,
  extractApiKeyFromRequest,
  validateApiKey,
  authenticateRequest,
} from "@/lib/api-keys";
import { auth } from "@/lib/auth";

const mockAuth = auth as ReturnType<typeof vi.fn>;

describe("Authentication Flow Integration Tests", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  describe("API Key generation and validation flow", () => {
    it("should generate, hash, and validate an API key", async () => {
      // Step 1: Generate a new API key
      const plainKey = generateApiKey();
      expect(plainKey.startsWith("mk_")).toBe(true);
      expect(isValidApiKeyFormat(plainKey)).toBe(true);

      // Step 2: Hash the key (as would happen during storage)
      const hashedKey = hashApiKey(plainKey);
      expect(hashedKey.length).toBe(64);

      // Step 3: Get the prefix (for display purposes)
      const prefix = getKeyPrefix(plainKey);
      expect(prefix.length).toBe(12);
      expect(plainKey.startsWith(prefix)).toBe(true);

      // Step 4: Set up mock for validation
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key_123",
        userId: "user_123",
        keyHash: hashedKey,
        keyPrefix: prefix,
        revokedAt: null,
        expiresAt: null,
        user: { id: "user_123", email: "test@example.com", name: "Test User" },
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      // Step 5: Validate the key
      const result = await validateApiKey(plainKey);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe("user_123");
      expect(result?.authMethod).toBe("api_key");
      expect(result?.apiKeyId).toBe("key_123");
    });

    it("should reject revoked API keys", async () => {
      const plainKey = generateApiKey();
      const hashedKey = hashApiKey(plainKey);
      const prefix = getKeyPrefix(plainKey);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key_123",
        userId: "user_123",
        keyHash: hashedKey,
        keyPrefix: prefix,
        revokedAt: new Date(), // Key is revoked
        expiresAt: null,
        user: { id: "user_123", email: "test@example.com", name: "Test User" },
      });

      const result = await validateApiKey(plainKey);
      expect(result).toBeNull();
    });

    it("should reject expired API keys", async () => {
      const plainKey = generateApiKey();
      const hashedKey = hashApiKey(plainKey);
      const prefix = getKeyPrefix(plainKey);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key_123",
        userId: "user_123",
        keyHash: hashedKey,
        keyPrefix: prefix,
        revokedAt: null,
        expiresAt: new Date("2020-01-01"), // Key is expired
        user: { id: "user_123", email: "test@example.com", name: "Test User" },
      });

      const result = await validateApiKey(plainKey);
      expect(result).toBeNull();
    });
  });

  describe("Request authentication flow", () => {
    it("should authenticate via session when available", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "session_user", email: "session@example.com", name: "Session User" },
      });

      const request = new NextRequest("http://localhost:3000/api/test");
      const result = await authenticateRequest(request);

      expect(result?.authMethod).toBe("session");
      expect(result?.userId).toBe("session_user");
    });

    it("should authenticate via Bearer token when no session", async () => {
      mockAuth.mockResolvedValue(null);

      const plainKey = generateApiKey();
      const hashedKey = hashApiKey(plainKey);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key_456",
        userId: "api_user",
        keyHash: hashedKey,
        keyPrefix: getKeyPrefix(plainKey),
        revokedAt: null,
        expiresAt: null,
        user: { id: "api_user", email: "api@example.com", name: "API User" },
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: `Bearer ${plainKey}`,
        },
      });

      const result = await authenticateRequest(request);

      expect(result?.authMethod).toBe("api_key");
      expect(result?.userId).toBe("api_user");
      expect(result?.apiKeyId).toBe("key_456");
    });

    it("should authenticate via ApiKey scheme when no session", async () => {
      mockAuth.mockResolvedValue(null);

      const plainKey = generateApiKey();
      const hashedKey = hashApiKey(plainKey);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key_789",
        userId: "api_user_2",
        keyHash: hashedKey,
        keyPrefix: getKeyPrefix(plainKey),
        revokedAt: null,
        expiresAt: null,
        user: { id: "api_user_2", email: "api2@example.com", name: "API User 2" },
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: `ApiKey ${plainKey}`,
        },
      });

      const result = await authenticateRequest(request);

      expect(result?.authMethod).toBe("api_key");
      expect(result?.userId).toBe("api_user_2");
    });

    it("should prefer session auth over API key when both available", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "session_user", email: "session@example.com", name: "Session User" },
      });

      const plainKey = generateApiKey();

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: `Bearer ${plainKey}`,
        },
      });

      const result = await authenticateRequest(request);

      expect(result?.authMethod).toBe("session");
      expect(result?.userId).toBe("session_user");
      // API key validation should not be attempted when session is valid
      expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it("should return null when neither auth method succeeds", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/test");
      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });

    it("should return null for invalid API key format", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer invalid_key_format",
        },
      });

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
      expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it("should return null for unsupported auth scheme", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      });

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });
  });

  describe("API Key extraction flow", () => {
    it("should extract key from Bearer token", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer mk_1234567890abcdefghijklmnop",
        },
      });

      const key = extractApiKeyFromRequest(request);
      expect(key).toBe("mk_1234567890abcdefghijklmnop");
    });

    it("should extract key from ApiKey token", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "ApiKey mk_1234567890abcdefghijklmnop",
        },
      });

      const key = extractApiKeyFromRequest(request);
      expect(key).toBe("mk_1234567890abcdefghijklmnop");
    });

    it("should return null for missing Authorization header", () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const key = extractApiKeyFromRequest(request);
      expect(key).toBeNull();
    });

    it("should return null for invalid key format in header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer short",
        },
      });

      const key = extractApiKeyFromRequest(request);
      expect(key).toBeNull();
    });
  });

  describe("API Key format validation", () => {
    it("should accept valid key format", () => {
      expect(isValidApiKeyFormat("mk_1234567890abcdefghijklmnop")).toBe(true);
    });

    it("should reject key without prefix", () => {
      expect(isValidApiKeyFormat("1234567890abcdefghijklmnop")).toBe(false);
    });

    it("should reject short key", () => {
      expect(isValidApiKeyFormat("mk_short")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidApiKeyFormat("")).toBe(false);
    });

    it("should accept keys of various lengths", () => {
      // Minimum length should be around 20 characters total
      expect(isValidApiKeyFormat("mk_12345678901234567890")).toBe(true);
      expect(isValidApiKeyFormat("mk_" + "a".repeat(50))).toBe(true);
    });
  });

  describe("Last used tracking", () => {
    it("should update lastUsedAt when API key is validated", async () => {
      const plainKey = generateApiKey();
      const hashedKey = hashApiKey(plainKey);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: "key_tracking",
        userId: "user_123",
        keyHash: hashedKey,
        keyPrefix: getKeyPrefix(plainKey),
        revokedAt: null,
        expiresAt: null,
        user: { id: "user_123", email: "test@example.com", name: "Test User" },
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      await validateApiKey(plainKey);

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key_tracking" },
        data: { lastUsedAt: expect.any(Date) },
      });
    });
  });
});
