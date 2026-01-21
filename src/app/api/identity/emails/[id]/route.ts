import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { Visibility } from "@/generated/prisma/client";

// PATCH: Update email address, visibility, or primary status
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
    const { email, visibility, isPrimary } = body;

    // Verify ownership
    const identityEmail = await prisma.identityEmail.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!identityEmail || identityEmail.identity.userId !== authResult.userId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // If setting as primary, unset other primary emails
    if (isPrimary) {
      await prisma.identityEmail.updateMany({
        where: {
          identityId: identityEmail.identityId,
          NOT: { id },
        },
        data: { isPrimary: false },
      });
    }

    // Prevent changing the login email address
    const isLoginEmail = authResult.user?.email?.toLowerCase() === identityEmail.email.toLowerCase();
    if (isLoginEmail && email !== undefined && email.toLowerCase() !== identityEmail.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot change your login email address. Add a new email instead." },
        { status: 400 }
      );
    }

    // If email address is being changed, reset verification status
    const emailChanged = email !== undefined && email !== identityEmail.email;

    const updated = await prisma.identityEmail.update({
      where: { id },
      data: {
        ...(email !== undefined && { email: email.trim().toLowerCase() }),
        ...(emailChanged && { verified: "UNVERIFIED", verificationToken: null }),
        ...(visibility !== undefined && { visibility: visibility as Visibility }),
        ...(isPrimary !== undefined && { isPrimary }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating email:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}

// DELETE: Remove an email
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
    const identityEmail = await prisma.identityEmail.findUnique({
      where: { id },
      include: { identity: true },
    });

    if (!identityEmail || identityEmail.identity.userId !== authResult.userId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Prevent deleting the login email address
    const isLoginEmail = authResult.user?.email?.toLowerCase() === identityEmail.email.toLowerCase();
    if (isLoginEmail) {
      return NextResponse.json(
        { error: "Cannot delete your login email address" },
        { status: 400 }
      );
    }

    await prisma.identityEmail.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting email:", error);
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    );
  }
}
