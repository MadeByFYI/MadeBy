import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";

// Reserved routes that should not be treated as handles
const RESERVED_ROUTES = [
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
  "emails",
  "phones",
  "domains",
  "address",
  "handle",
  "handles",
  "provider-credential",
];

// GET: Fetch public profile by handle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    // Check reserved routes
    if (RESERVED_ROUTES.includes(handle.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid handle" },
        { status: 400 }
      );
    }

    // Check if requester is authenticated (to determine if they're the owner)
    const authResult = await authenticateRequest(request);

    const identity = await prisma.identity.findUnique({
      where: { handle: handle.toLowerCase() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        mailingAddress: true,
        emails: { orderBy: { isPrimary: "desc" } },
        phones: { orderBy: { isPrimary: "desc" } },
        domains: { orderBy: { createdAt: "desc" } },
        aiConfig: true,
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found" },
        { status: 404 }
      );
    }

    const isOwner = authResult?.userId === identity.userId;

    // Filter by visibility - owner sees all, visitors see only public
    const visibleEmails = (isOwner
      ? identity.emails
      : identity.emails.filter((e) => e.visibility === "PUBLIC")
    ).map((e) => ({
      id: e.id,
      email: e.email,
      isPrimary: e.isPrimary,
      verified: e.verified,
      visibility: isOwner ? e.visibility : undefined,
    }));

    const visiblePhones = (isOwner
      ? identity.phones
      : identity.phones.filter((p) => p.visibility === "PUBLIC")
    ).map((p) => ({
      id: p.id,
      phone: p.phone,
      isPrimary: p.isPrimary,
      verified: p.verified,
      visibility: isOwner ? p.visibility : undefined,
    }));

    const visibleDomains = (isOwner
      ? identity.domains
      : identity.domains.filter((d) => d.visibility === "PUBLIC")
    ).map((d) => ({
      id: d.id,
      domain: d.domain,
      verified: d.verified,
      visibility: isOwner ? d.visibility : undefined,
    }));

    const visibleAddress =
      isOwner || identity.mailingAddress?.visibility === "PUBLIC"
        ? identity.mailingAddress
          ? {
              id: identity.mailingAddress.id,
              street1: identity.mailingAddress.street1,
              street2: identity.mailingAddress.street2,
              city: identity.mailingAddress.city,
              state: identity.mailingAddress.state,
              postalCode: identity.mailingAddress.postalCode,
              country: identity.mailingAddress.country,
              verified: identity.mailingAddress.verified,
              visibility: isOwner ? identity.mailingAddress.visibility : undefined,
            }
          : null
        : null;

    // Get user's content declarations
    const contents = await prisma.content.findMany({
      where: { userId: identity.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        contentType: true,
        creatorName: true,
        owner: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      handle: identity.handle,
      displayName: identity.displayName || identity.user.name,
      bio: identity.bio,
      avatarUrl: identity.avatarUrl || identity.user.image,
      identityType: identity.identityType,
      aiConfig: identity.identityType === "AI" ? identity.aiConfig : undefined,
      isOwner,
      emails: visibleEmails,
      phones: visiblePhones,
      domains: visibleDomains,
      mailingAddress: visibleAddress,
      contents,
    });
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
