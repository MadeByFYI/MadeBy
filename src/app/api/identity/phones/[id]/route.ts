import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { Visibility } from "@/generated/prisma";

// PATCH: Update phone number, visibility, or primary status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { phone, visibility, isPrimary } = body;

    // Verify ownership
    const identityPhone = await prisma.identityPhone.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!identityPhone || identityPhone.identity.userId !== authResult.userId) {
      return NextResponse.json({ error: "Phone not found" }, { status: 404 });
    }

    // If setting as primary, unset other primary phones
    if (isPrimary) {
      await prisma.identityPhone.updateMany({
        where: {
          identityId: identityPhone.identityId,
          NOT: { id },
        },
        data: { isPrimary: false },
      });
    }

    // If phone number is being changed, reset verification status
    const phoneChanged = phone !== undefined && phone !== identityPhone.phone;

    const updated = await prisma.identityPhone.update({
      where: { id },
      data: {
        ...(phone !== undefined && { phone: phone.trim() }),
        ...(phoneChanged && { verified: "UNVERIFIED" }),
        ...(visibility !== undefined && { visibility: visibility as Visibility }),
        ...(isPrimary !== undefined && { isPrimary }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating phone:", error);
    return NextResponse.json(
      { error: "Failed to update phone" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a phone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const identityPhone = await prisma.identityPhone.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!identityPhone || identityPhone.identity.userId !== authResult.userId) {
      return NextResponse.json({ error: "Phone not found" }, { status: 404 });
    }

    await prisma.identityPhone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting phone:", error);
    return NextResponse.json(
      { error: "Failed to delete phone" },
      { status: 500 }
    );
  }
}
