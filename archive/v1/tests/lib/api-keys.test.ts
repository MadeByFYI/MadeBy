import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetPrismaMocks } from "../mocks/prisma";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock the auth
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

describe("API Keys - generateApiKey", () => {
  it("should generate a key with mk_ prefix", () => {
    const key = generateApiKey();
    expect(key.startsWith("mk_")).toBe(true);
  });

  it("should generate unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });

  it("should generate keys of sufficient length", () => {
    const key = generateApiKey();
    expect(key.length).toBeGreaterThan(30);
  });
});

describe("API Keys - hashApiKey", () => {
  it("should produce consistent hashes", () => {
    const key = "mk_test_key_12345";
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different keys", () => {
    const hash1 = hashApiKey("mk_key_1");
    const hash2 = hashApiKey("mk_key_2");
    expect(hash1).not.toBe(hash2);
  });

  it("should produce 64-character hex hash (SHA256)", () => {
    const hash = hashApiKey("mk_test");
    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });
});

describe("API Keys - getKeyPrefix", () => {
  it("should return first 12 characters", () => {
    const key = "mk_abcdefghijklmnop";
    const prefix = getKeyPrefix(key);
    expect(prefix).toBe("mk_abcdefghi"); // 12 characters: mk_ + 9 chars
    expect(prefix.length).toBe(12);
  });
});

describe("API Keys - isValidApiKeyFormat", () => {
  it("should return true for valid key format", () => {
    expect(isValidApiKeyFormat("mk_abcdefghijklmnopqrstuvwxyz")).toBe(true);
  });

  it("should return false for key without prefix", () => {
    expect(isValidApiKeyFormat("abcdefghijklmnopqrstuvwxyz")).toBe(false);
  });

  it("should return false for short key", () => {
    expect(isValidApiKeyFormat("mk_short")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidApiKeyFormat("")).toBe(false);
  });
});

describe("API Keys - extractApiKeyFromRequest", () => {
  it("should extract key from Bearer token", () => {
    const request = new NextRequest("http://localhost:3000", {
      headers: {
        Authorization: "Bearer mk_abcdefghijklmnopqrstuvwxyz",
      },
    });

    const key = extractApiKeyFromRequest(request);
    expect(key).toBe("mk_abcdefghijklmnopqrstuvwxyz");
  });

  it("should extract key from ApiKey header", () => {
    const request = new NextRequest("http://localhost:3000", {
      headers: {
        Authorization: "ApiKey mk_abcdefghijklmnopqrstuvwxyz",
      },
    });

    const key = extractApiKeyFromRequest(request);
    expect(key).toBe("mk_abcdefghijklmnopqrstuvwxyz");
  });

  it("should return null for missing header", () => {
    const request = new NextRequest("http://localhost:3000");
    const key = extractApiKeyFromRequest(request);
    expect(key).toBeNull();
  });

  it("should return null for invalid key format in header", () => {
    const request = new NextRequest("http://localhost:3000", {
      headers: {
        Authorization: "Bearer invalid_key",
      },
    });

    const key = extractApiKeyFromRequest(request);
    expect(key).toBeNull();
  });

  it("should return null for unsupported auth scheme", () => {
    const request = new NextRequest("http://localhost:3000", {
      headers: {
        Authorization: "Basic dXNlcjpwYXNz",
      },
    });

    const key = extractApiKeyFromRequest(request);
    expect(key).toBeNull();
  });
});

describe("API Keys - validateApiKey", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  it("should return null for invalid key format", async () => {
    const result = await validateApiKey("invalid");
    expect(result).toBeNull();
    expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it("should return null for non-existent key", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null);

    const result = await validateApiKey("mk_abcdefghijklmnopqrstuvwxyz");
    expect(result).toBeNull();
  });

  it("should return null for revoked key", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: "key_123",
      userId: "user_123",
      revokedAt: new Date(),
      expiresAt: null,
      user: { id: "user_123", email: "test@example.com", name: "Test" },
    });

    const result = await validateApiKey("mk_abcdefghijklmnopqrstuvwxyz");
    expect(result).toBeNull();
  });

  it("should return null for expired key", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: "key_123",
      userId: "user_123",
      revokedAt: null,
      expiresAt: new Date("2020-01-01"),
      user: { id: "user_123", email: "test@example.com", name: "Test" },
    });

    const result = await validateApiKey("mk_abcdefghijklmnopqrstuvwxyz");
    expect(result).toBeNull();
  });

  it("should return auth result for valid key", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: "key_123",
      userId: "user_123",
      revokedAt: null,
      expiresAt: null,
      user: { id: "user_123", email: "test@example.com", name: "Test" },
    });
    mockPrisma.apiKey.update.mockResolvedValue({});

    const result = await validateApiKey("mk_abcdefghijklmnopqrstuvwxyz");

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user_123");
    expect(result?.authMethod).toBe("api_key");
    expect(result?.apiKeyId).toBe("key_123");
  });
});

describe("API Keys - authenticateRequest", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should prefer session auth when available", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user_123", email: "test@example.com", name: "Test" },
    });

    const request = new NextRequest("http://localhost:3000", {
      headers: {
        Authorization: "Bearer mk_abcdefghijklmnopqrstuvwxyz",
      },
    });

    const result = await authenticateRequest(request);

    expect(result?.authMethod).toBe("session");
    expect(result?.userId).toBe("user_123");
  });

  it("should fall back to API key when no session", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: "key_123",
      userId: "user_456",
      revokedAt: null,
      expiresAt: null,
      user: { id: "user_456", email: "api@example.com", name: "API User" },
    });
    mockPrisma.apiKey.update.mockResolvedValue({});

    const request = new NextRequest("http://localhost:3000", {
      headers: {
        Authorization: "Bearer mk_abcdefghijklmnopqrstuvwxyz",
      },
    });

    const result = await authenticateRequest(request);

    expect(result?.authMethod).toBe("api_key");
    expect(result?.userId).toBe("user_456");
  });

  it("should return null when no auth method succeeds", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000");
    const result = await authenticateRequest(request);

    expect(result).toBeNull();
  });
});
