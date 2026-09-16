import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";

// Reserved routes that cannot be used as handles
const RESERVED_HANDLES = [
  "api",
  "auth",
  "dashboard",
  "settings",
  "declaration",
  "success",
  "verify",
  "about",
  "privacy",
  "terms",
  "admin",
  "help",
  "support",
  "contact",
  "blog",
  "docs",
  "legal",
  "_next",
  "static",
  "public",
];

// Handle validation regex
const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { handle } = body;

    if (!handle) {
      return NextResponse.json(
        { error: "Handle is required" },
        { status: 400 }
      );
    }

    const normalizedHandle = handle.toLowerCase();

    // Check format
    if (!HANDLE_REGEX.test(normalizedHandle)) {
      return NextResponse.json({
        available: false,
        reason: "invalid_format",
        message:
          "Handle must be 3-30 characters, alphanumeric with hyphens, cannot start/end with hyphen",
      });
    }

    // Check reserved handles
    if (RESERVED_HANDLES.includes(normalizedHandle)) {
      return NextResponse.json({
        available: false,
        reason: "reserved",
        message: "This handle is reserved",
      });
    }

    // Check if handle is taken (excluding current user's identity)
    const existingIdentity = await prisma.identity.findUnique({
      where: { handle: normalizedHandle },
    });

    if (existingIdentity && existingIdentity.userId !== authResult.userId) {
      return NextResponse.json({
        available: false,
        reason: "taken",
        message: "This handle is already taken",
      });
    }

    return NextResponse.json({
      available: true,
      handle: normalizedHandle,
    });
  } catch (error) {
    console.error("Error checking handle:", error);
    return NextResponse.json(
      { error: "Failed to check handle" },
      { status: 500 }
    );
  }
}
