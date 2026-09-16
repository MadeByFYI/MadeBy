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
import { GET, PATCH, DELETE } from "@/app/api/content/[id]/route";
import { authenticateRequest } from "@/lib/api-keys";

const mockAuth = authenticateRequest as ReturnType<typeof vi.fn>;

const mockContent = {
  id: "content_123",
  title: "Test Content",
  description: "Description",
  contentType: "HUMAN",
  creatorName: "Test Creator",
  userId: "user_123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Content API - GET /api/content/[id]", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should return content by ID (public endpoint)", async () => {
    mockPrisma.content.findUnique.mockResolvedValue(mockContent);

    const request = new NextRequest("http://localhost:3000/api/content/content_123");
    const response = await GET(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("content_123");
    expect(data.title).toBe("Test Content");
  });

  it("should return 404 for non-existent content", async () => {
    mockPrisma.content.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/content/nonexistent");
    const response = await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Content not found");
  });

  it("should include representationAcceptance when present", async () => {
    const contentWithRep = {
      ...mockContent,
      representationAcceptance: {
        id: "accept_123",
        signatureName: "John Doe",
        representation: {
          code: "PERJURY",
          name: "Gold Standard",
        },
      },
    };

    mockPrisma.content.findUnique.mockResolvedValue(contentWithRep);

    const request = new NextRequest("http://localhost:3000/api/content/content_123");
    const response = await GET(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.representationAcceptance).toBeDefined();
    expect(data.representationAcceptance.signatureName).toBe("John Doe");
  });
});

describe("Content API - PATCH /api/content/[id]", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 for non-existent content", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/content/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Content not found");
  });

  it("should return 403 if user doesn't own the content", async () => {
    mockAuth.mockResolvedValue({ userId: "other_user" });
    mockPrisma.content.findUnique.mockResolvedValue(mockContent); // owned by user_123

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You can only update your own content");
  });

  it("should update content successfully", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.findUnique.mockResolvedValue(mockContent);
    mockPrisma.content.update.mockResolvedValue({
      ...mockContent,
      title: "Updated Title",
    });

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Updated Title");
  });

  it("should validate contentType on update", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.findUnique.mockResolvedValue(mockContent);

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "PATCH",
      body: JSON.stringify({ contentType: "INVALID" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid content type");
  });
});

describe("Content API - DELETE /api/content/[id]", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 for non-existent content", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/content/nonexistent", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Content not found");
  });

  it("should return 403 if user doesn't own the content", async () => {
    mockAuth.mockResolvedValue({ userId: "other_user" });
    mockPrisma.content.findUnique.mockResolvedValue(mockContent);

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You can only delete your own content");
  });

  it("should delete content successfully", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockPrisma.content.findUnique.mockResolvedValue(mockContent);
    mockPrisma.content.delete.mockResolvedValue(mockContent);

    const request = new NextRequest("http://localhost:3000/api/content/content_123", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "content_123" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
