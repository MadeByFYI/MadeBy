import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { Visibility } from "@/generated/prisma/client";

// GET: List all emails for current user's identity
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: {
        emails: { orderBy: { isPrimary: "desc" } },
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    return NextResponse.json(identity.emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

// POST: Add a new email
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, visibility, isPrimary } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Check if email already exists for this identity
    const existing = await prisma.identityEmail.findFirst({
      where: { identityId: identity.id, email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already added" },
        { status: 409 }
      );
    }

    // If setting as primary, unset other primary emails
    if (isPrimary) {
      await prisma.identityEmail.updateMany({
        where: { identityId: identity.id },
        data: { isPrimary: false },
      });
    }

    const identityEmail = await prisma.identityEmail.create({
      data: {
        identityId: identity.id,
        email: email.toLowerCase(),
        visibility: (visibility as Visibility) || "PRIVATE",
        isPrimary: isPrimary || false,
      },
    });

    return NextResponse.json(identityEmail, { status: 201 });
  } catch (error) {
    console.error("Error adding email:", error);
    return NextResponse.json(
      { error: "Failed to add email" },
      { status: 500 }
    );
  }
}
