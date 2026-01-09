import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { IdentityType } from "@/generated/prisma";

// Handle validation regex: 3-30 chars, alphanumeric + hyphens, can't start/end with hyphen
const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// GET: Fetch current user's identity
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: session.user.id },
      include: {
        mailingAddress: true,
        emails: { orderBy: { isPrimary: "desc" } },
        phones: { orderBy: { isPrimary: "desc" } },
        domains: { orderBy: { createdAt: "desc" } },
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { handle, identityType, displayName, bio, avatarUrl } = body;

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
      where: { userId: session.user.id },
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
        userId: session.user.id,
        handle: handle?.toLowerCase() || null,
        identityType: (identityType as IdentityType) || "INDIVIDUAL",
        displayName: displayName || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        // Add user's login email as primary email
        emails: session.user.email
          ? {
              create: {
                email: session.user.email.toLowerCase(),
                isPrimary: true,
                visibility: "PRIVATE",
                verified: "VERIFIED", // Trust the login email as verified
              },
            }
          : undefined,
      },
      include: {
        emails: true,
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { handle, identityType, displayName, bio, avatarUrl } = body;

    // Check if identity exists
    const existing = await prisma.identity.findUnique({
      where: { userId: session.user.id },
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
          NOT: { userId: session.user.id },
        },
      });
      if (handleExists) {
        return NextResponse.json(
          { error: "Handle already taken" },
          { status: 409 }
        );
      }
    }

    const identity = await prisma.identity.update({
      where: { userId: session.user.id },
      data: {
        ...(handle !== undefined && {
          handle: handle === "" ? null : handle.toLowerCase(),
        }),
        ...(identityType && { identityType: identityType as IdentityType }),
        ...(displayName !== undefined && { displayName: displayName || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
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
