import { http, HttpResponse } from "msw";

// Mock data
export const mockRepresentations = [
  {
    id: "rep_standard_123",
    code: "STANDARD",
    assertionLevel: "STANDARD",
    name: "Standard Assertion",
    shortDescription: "Best knowledge assertion",
    assertionText: "I have applied the correct badge to the content to the best of my knowledge.",
    fullLegalText: "LEGAL REPRESENTATION - STANDARD ASSERTION...",
  },
  {
    id: "rep_perjury_456",
    code: "PERJURY",
    assertionLevel: "PERJURY",
    name: "Gold Standard Assertion",
    shortDescription: "Under penalty of perjury + signature",
    assertionText: "I have applied the correct badge...",
    fullLegalText: "LEGAL REPRESENTATION - PERJURY DECLARATION...",
  },
];

export const mockContent = {
  id: "content_123",
  title: "Test Content",
  description: "A test content declaration",
  contentType: "HUMAN",
  creatorName: "Test Creator",
  originalUrl: "https://example.com/content",
  thumbnailUrl: null,
  attribution: null,
  collaborators: null,
  aiToolsUsed: null,
  owner: null,
  userId: "user_123",
  contentHash: null,
  hashAlgorithm: null,
  hashTarget: null,
  hashCreatedAt: null,
  hashInputSize: null,
  hashInputFilename: null,
  gitCommitHash: null,
  gitRepositoryUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  representationAcceptance: null,
};

export const mockUser = {
  id: "user_123",
  name: "Test User",
  email: "test@example.com",
};

export const mockIdentity = {
  id: "identity_123",
  userId: "user_123",
  identityType: "INDIVIDUAL",
  handle: "testuser",
  displayName: "Test User",
  bio: "A test user",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock request handlers
export const handlers = [
  // Representations
  http.get("http://localhost:3000/api/representations", () => {
    return HttpResponse.json({ representations: mockRepresentations });
  }),

  // Content - List
  http.get("http://localhost:3000/api/content", ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    return HttpResponse.json({
      contents: [mockContent],
      pagination: {
        total: 1,
        limit,
        offset,
        hasMore: false,
      },
    });
  }),

  // Content - Create
  http.post("http://localhost:3000/api/content", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    // Validate required fields
    if (!body.title || !body.creatorName || !body.contentType) {
      return HttpResponse.json(
        { error: "Title, creator name, and content type are required" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!["HUMAN", "AI", "WITH_AI"].includes(body.contentType as string)) {
      return HttpResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Validate PERJURY requires signature
    if (body.representationCode === "PERJURY" && !body.signatureName) {
      return HttpResponse.json(
        { error: "Signature name is required for Gold Standard assertions" },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      { id: "content_new_123" },
      { status: 201 }
    );
  }),

  // Content - Get by ID
  http.get("http://localhost:3000/api/content/:id", ({ params }) => {
    const { id } = params;

    if (id === "nonexistent") {
      return HttpResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      ...mockContent,
      id,
    });
  }),

  // Content - Update
  http.patch("http://localhost:3000/api/content/:id", async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as Record<string, unknown>;

    if (id === "nonexistent") {
      return HttpResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    if (id === "not_owned") {
      return HttpResponse.json(
        { error: "You can only update your own content" },
        { status: 403 }
      );
    }

    return HttpResponse.json({
      ...mockContent,
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  // Content - Delete
  http.delete("http://localhost:3000/api/content/:id", ({ params }) => {
    const { id } = params;

    if (id === "nonexistent") {
      return HttpResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    if (id === "not_owned") {
      return HttpResponse.json(
        { error: "You can only delete your own content" },
        { status: 403 }
      );
    }

    return HttpResponse.json({ success: true });
  }),

  // Identity - Get
  http.get("http://localhost:3000/api/identity", () => {
    return HttpResponse.json(mockIdentity);
  }),

  // Handle check
  http.post("http://localhost:3000/api/identity/handle/check", async ({ request }) => {
    const body = await request.json() as { handle: string };

    if (body.handle === "taken") {
      return HttpResponse.json({
        available: false,
        reason: "taken",
        message: "This handle is already taken",
      });
    }

    if (body.handle === "invalid!") {
      return HttpResponse.json({
        available: false,
        reason: "invalid",
        message: "Handle contains invalid characters",
      });
    }

    return HttpResponse.json({
      available: true,
    });
  }),
];
