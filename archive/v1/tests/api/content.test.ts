import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetPrismaMocks } from "../mocks/prisma";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock the authentication
vi.mock("@/lib/api-keys", () => ({
  authenticateRequest: vi.fn(),
}));

// Import after mocking
import { GET, POST } from "@/app/api/content/route";
import { authenticateRequest } from "@/lib/api-keys";

const mockAuth = authenticateRequest as ReturnType<typeof vi.fn>;

describe("Content API - GET /api/content", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/content");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return user's content with pagination", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const mockContents = [
      { id: "content_1", title: "Test 1", contentType: "HUMAN" },
      { id: "content_2", title: "Test 2", contentType: "AI" },
    ];

    mockPrisma.content.count.mockResolvedValue(2);
    mockPrisma.content.findMany.mockResolvedValue(mockContents);

    const request = new NextRequest("http://localhost:3000/api/content");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contents).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
    expect(data.pagination.hasMore).toBe(false);
  });

  it("should respect limit and offset parameters", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.count.mockResolvedValue(100);
    mockPrisma.content.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/content?limit=10&offset=20");
    await GET(request);

    expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    );
  });

  it("should filter by contentType", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.count.mockResolvedValue(5);
    mockPrisma.content.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/content?contentType=HUMAN");
    await GET(request);

    expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contentType: "HUMAN",
        }),
      })
    );
  });

  it("should cap limit at 100", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.count.mockResolvedValue(0);
    mockPrisma.content.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/content?limit=500");
    await GET(request);

    expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });
});

describe("Content API - POST /api/content", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should return 400 if required fields are missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }), // missing creatorName and contentType
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("should return 400 for invalid content type", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      body: JSON.stringify({
        title: "Test",
        creatorName: "Creator",
        contentType: "INVALID",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid content type");
  });

  it("should create content successfully", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });

    mockPrisma.content.create.mockResolvedValue({ id: "new_content_123" });

    const request = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      body: JSON.stringify({
        title: "My Artwork",
        creatorName: "Jane Doe",
        contentType: "HUMAN",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("new_content_123");
  });

  it("should require signatureName for PERJURY representation", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    mockPrisma.legalRepresentation.findUnique.mockResolvedValue({
      id: "rep_123",
      assertionLevel: "PERJURY",
      fullLegalText: "Legal text...",
    });

    const request = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      body: JSON.stringify({
        title: "My Artwork",
        creatorName: "Jane Doe",
        contentType: "HUMAN",
        representationCode: "PERJURY",
        // signatureName is missing
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Signature name is required");
  });

  it("should accept representationCode as alternative to representationId", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    mockPrisma.legalRepresentation.findUnique.mockResolvedValue({
      id: "rep_standard_123",
      assertionLevel: "STANDARD",
      fullLegalText: "Legal text...",
    });

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });

    mockPrisma.content.create.mockResolvedValue({ id: "new_content_123" });

    const request = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      body: JSON.stringify({
        title: "My Artwork",
        creatorName: "Jane Doe",
        contentType: "HUMAN",
        representationCode: "STANDARD",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockPrisma.legalRepresentation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: "STANDARD" },
      })
    );
  });

  it("should validate hash algorithm", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest("http://localhost:3000/api/content", {
      method: "POST",
      body: JSON.stringify({
        title: "My Artwork",
        creatorName: "Jane Doe",
        contentType: "HUMAN",
        contentHash: "abc123",
        hashAlgorithm: "INVALID_ALGO",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid hash algorithm");
  });
});
