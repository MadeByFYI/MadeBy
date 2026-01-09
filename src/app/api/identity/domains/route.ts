import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Visibility } from "@/generated/prisma";
import crypto from "crypto";

// GET: List all domains for current user's identity
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: session.user.id },
      include: {
        domains: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    return NextResponse.json(identity.domains);
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

// POST: Add a new domain
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domain, visibility } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Normalize domain (lowercase, remove protocol and trailing slash)
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .replace(/^www\./, "");

    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(normalizedDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: session.user.id },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    // Check if domain already exists for this identity
    const existing = await prisma.identityDomain.findFirst({
      where: { identityId: identity.id, domain: normalizedDomain },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Domain already added" },
        { status: 409 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(16).toString("hex");

    const identityDomain = await prisma.identityDomain.create({
      data: {
        identityId: identity.id,
        domain: normalizedDomain,
        visibility: (visibility as Visibility) || "PUBLIC",
        verificationToken,
      },
    });

    return NextResponse.json(identityDomain, { status: 201 });
  } catch (error) {
    console.error("Error adding domain:", error);
    return NextResponse.json(
      { error: "Failed to add domain" },
      { status: 500 }
    );
  }
}
