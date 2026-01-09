import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Visibility } from "@/generated/prisma";
import { randomUUID } from "crypto";

// PATCH: Update domain name or visibility
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { domain, visibility } = body;

    // Verify ownership
    const identityDomain = await prisma.identityDomain.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!identityDomain || identityDomain.identity.userId !== session.user.id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // If domain is being changed, reset verification and generate new token
    const domainChanged = domain !== undefined && domain !== identityDomain.domain;
    const normalizedDomain = domain?.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "");

    const updated = await prisma.identityDomain.update({
      where: { id },
      data: {
        ...(domain !== undefined && { domain: normalizedDomain }),
        ...(domainChanged && { verified: "UNVERIFIED", verificationToken: randomUUID() }),
        ...(visibility !== undefined && { visibility: visibility as Visibility }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating domain:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const identityDomain = await prisma.identityDomain.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!identityDomain || identityDomain.identity.userId !== session.user.id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    await prisma.identityDomain.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}
