import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { Visibility } from "@/generated/prisma/client";

// GET: List all phones for current user's identity
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: {
        phones: { orderBy: { isPrimary: "desc" } },
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    return NextResponse.json(identity.phones);
  } catch (error) {
    console.error("Error fetching phones:", error);
    return NextResponse.json(
      { error: "Failed to fetch phones" },
      { status: 500 }
    );
  }
}

// POST: Add a new phone
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, visibility, isPrimary } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }

    // Normalize phone (remove spaces, dashes, parentheses)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Basic E.164 format validation (should start with +)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Invalid phone format. Use E.164 format (e.g., +12025551234)" },
        { status: 400 }
      );
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    // Check if phone already exists for this identity
    const existing = await prisma.identityPhone.findFirst({
      where: { identityId: identity.id, phone: normalizedPhone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Phone already added" },
        { status: 409 }
      );
    }

    // If setting as primary, unset other primary phones
    if (isPrimary) {
      await prisma.identityPhone.updateMany({
        where: { identityId: identity.id },
        data: { isPrimary: false },
      });
    }

    const identityPhone = await prisma.identityPhone.create({
      data: {
        identityId: identity.id,
        phone: normalizedPhone,
        visibility: (visibility as Visibility) || "PRIVATE",
        isPrimary: isPrimary || false,
      },
    });

    return NextResponse.json(identityPhone, { status: 201 });
  } catch (error) {
    console.error("Error adding phone:", error);
    return NextResponse.json(
      { error: "Failed to add phone" },
      { status: 500 }
    );
  }
}
