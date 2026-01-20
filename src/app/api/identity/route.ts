import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { IdentityType, AIProvider, AIModel } from "@/generated/prisma";

// Handle validation regex: 3-30 chars, alphanumeric + hyphens, can't start/end with hyphen
const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// GET: Fetch current user's identity
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: {
        mailingAddress: true,
        emails: { orderBy: { isPrimary: "desc" } },
        phones: { orderBy: { isPrimary: "desc" } },
        domains: { orderBy: { createdAt: "desc" } },
        aiConfig: true,
        providerCredentials: {
          select: {
            id: true,
            provider: true,
            credentialType: true,
            isActive: true,
            lastUsedAt: true,
          },
        },
      },
    });

    return NextResponse.json(identity);
  } catch (error) {
    console.error("Error fetching identity:", error);
    return NextResponse.json(
      { error: "Failed to fetch identity" },
      { status: 500 }
    );
  }
}

// POST: Create identity for current user
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { handle, identityType, displayName, bio, avatarUrl, aiConfig } = body;

    // Validate handle format if provided
    if (handle) {
      const normalizedHandle = handle.toLowerCase();
      if (!HANDLE_REGEX.test(normalizedHandle)) {
        return NextResponse.json(
          {
            error:
              "Handle must be 3-30 characters, alphanumeric with hyphens, cannot start/end with hyphen",
          },
          { status: 400 }
        );
      }

      // Check handle uniqueness
      const handleExists = await prisma.identity.findUnique({
        where: { handle: normalizedHandle },
      });
      if (handleExists) {
        return NextResponse.json(
          { error: "Handle already taken" },
          { status: 409 }
        );
      }
    }

    // Check if identity already exists for this user
    const existing = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Identity already exists. Use PATCH to update." },
        { status: 409 }
      );
    }

    // Create identity with the user's login email as the primary email
    const identity = await prisma.identity.create({
      data: {
        userId: authResult.userId,
        handle: handle?.toLowerCase() || null,
        identityType: (identityType as IdentityType) || "INDIVIDUAL",
        displayName: displayName || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        // Add user's login email as primary email
        emails: authResult.user?.email
          ? {
              create: {
                email: authResult.user.email.toLowerCase(),
                isPrimary: true,
                visibility: "PRIVATE",
                verified: "VERIFIED", // Trust the login email as verified
              },
            }
          : undefined,
        // Create AI config if this is an AI identity
        aiConfig:
          identityType === "AI" && aiConfig
            ? {
                create: {
                  provider: aiConfig.provider as AIProvider,
                  model: aiConfig.model as AIModel,
                  modelVersion: aiConfig.modelVersion || null,
                },
              }
            : undefined,
      },
      include: {
        emails: true,
        aiConfig: true,
      },
    });

    return NextResponse.json(identity, { status: 201 });
  } catch (error) {
    console.error("Error creating identity:", error);
    return NextResponse.json(
      { error: "Failed to create identity" },
      { status: 500 }
    );
  }
}

// PATCH: Update identity
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { handle, identityType, displayName, bio, avatarUrl, aiConfig } = body;

    // Check if identity exists
    const existing = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: { aiConfig: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Identity not found. Use POST to create." },
        { status: 404 }
      );
    }

    // Validate handle format if changing
    if (handle !== undefined && handle !== null && handle !== "") {
      const normalizedHandle = handle.toLowerCase();
      if (!HANDLE_REGEX.test(normalizedHandle)) {
        return NextResponse.json(
          { error: "Invalid handle format" },
          { status: 400 }
        );
      }

      // Check handle uniqueness (excluding current user)
      const handleExists = await prisma.identity.findFirst({
        where: {
          handle: normalizedHandle,
          NOT: { userId: authResult.userId },
        },
      });
      if (handleExists) {
        return NextResponse.json(
          { error: "Handle already taken" },
          { status: 409 }
        );
      }
    }

    // Handle AI config updates
    let aiConfigUpdate = {};
    if (identityType === "AI" && aiConfig) {
      if (existing.aiConfig) {
        // Update existing AI config
        aiConfigUpdate = {
          aiConfig: {
            update: {
              provider: aiConfig.provider as AIProvider,
              model: aiConfig.model as AIModel,
              modelVersion: aiConfig.modelVersion || null,
            },
          },
        };
      } else {
        // Create new AI config
        aiConfigUpdate = {
          aiConfig: {
            create: {
              provider: aiConfig.provider as AIProvider,
              model: aiConfig.model as AIModel,
              modelVersion: aiConfig.modelVersion || null,
            },
          },
        };
      }
    } else if (identityType !== "AI" && existing.aiConfig) {
      // Remove AI config if switching away from AI type
      aiConfigUpdate = {
        aiConfig: {
          delete: true,
        },
      };
    }

    const identity = await prisma.identity.update({
      where: { userId: authResult.userId },
      data: {
        ...(handle !== undefined && {
          handle: handle === "" ? null : handle.toLowerCase(),
        }),
        ...(identityType && { identityType: identityType as IdentityType }),
        ...(displayName !== undefined && { displayName: displayName || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
        ...aiConfigUpdate,
      },
      include: {
        aiConfig: true,
      },
    });

    return NextResponse.json(identity);
  } catch (error) {
    console.error("Error updating identity:", error);
    return NextResponse.json(
      { error: "Failed to update identity" },
      { status: 500 }
    );
  }
}
