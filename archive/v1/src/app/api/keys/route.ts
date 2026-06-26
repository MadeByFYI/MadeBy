import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/api-keys";

// GET: List user's API keys
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await listApiKeys(session.user.id);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error listing API keys:", error);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

// POST: Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes, expiresInDays } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "API key name must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create the API key
    const result = await createApiKey(session.user.id, name.trim(), {
      scopes: scopes || undefined,
      expiresAt,
    });

    // Return the full key - this is the ONLY time it will be shown
    return NextResponse.json(
      {
        id: result.id,
        key: result.key,
        keyPrefix: result.keyPrefix,
        name: name.trim(),
        expiresAt: expiresAt?.toISOString() || null,
        message: "Store this key securely. It will not be shown again.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
