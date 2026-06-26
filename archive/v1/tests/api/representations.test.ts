import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma, resetPrismaMocks } from "../mocks/prisma";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import { GET } from "@/app/api/representations/route";

const mockRepresentations = [
  {
    id: "rep_standard_123",
    code: "STANDARD",
    assertionLevel: "STANDARD",
    name: "Standard Assertion",
    shortDescription: "Best knowledge assertion",
    assertionText: "I have applied the correct badge to the content to the best of my knowledge.",
    fullLegalText: "LEGAL REPRESENTATION - STANDARD ASSERTION...",
    isActive: true,
  },
  {
    id: "rep_perjury_456",
    code: "PERJURY",
    assertionLevel: "PERJURY",
    name: "Gold Standard Assertion",
    shortDescription: "Under penalty of perjury + signature",
    assertionText: "I have applied the correct badge...",
    fullLegalText: "LEGAL REPRESENTATION - PERJURY DECLARATION...",
    isActive: true,
  },
];

describe("Representations API - GET /api/representations", () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
  });

  it("should return all active representations", async () => {
    mockPrisma.legalRepresentation.findMany.mockResolvedValue(mockRepresentations);

    const request = new NextRequest("http://localhost:3000/api/representations");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.representations).toHaveLength(2);
  });

  it("should only include active representations", async () => {
    mockPrisma.legalRepresentation.findMany.mockResolvedValue(mockRepresentations);

    await GET();

    expect(mockPrisma.legalRepresentation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    );
  });

  it("should include required fields", async () => {
    mockPrisma.legalRepresentation.findMany.mockResolvedValue(mockRepresentations);

    const response = await GET();
    const data = await response.json();

    const rep = data.representations[0];
    expect(rep).toHaveProperty("id");
    expect(rep).toHaveProperty("code");
    expect(rep).toHaveProperty("assertionLevel");
    expect(rep).toHaveProperty("name");
    expect(rep).toHaveProperty("shortDescription");
    expect(rep).toHaveProperty("assertionText");
    expect(rep).toHaveProperty("fullLegalText");
  });

  it("should order by code ascending", async () => {
    mockPrisma.legalRepresentation.findMany.mockResolvedValue(mockRepresentations);

    await GET();

    expect(mockPrisma.legalRepresentation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { code: "asc" },
      })
    );
  });

  it("should handle database errors gracefully", async () => {
    mockPrisma.legalRepresentation.findMany.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch representations");
  });
});
