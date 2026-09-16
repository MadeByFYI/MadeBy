import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";

// DELETE: Remove a provider credential
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

    // Get user's identity
    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found" },
        { status: 404 }
      );
    }

    // Verify the credential belongs to this identity
    const credential = await prisma.providerCredential.findFirst({
      where: {
        id,
        identityId: identity.id,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Delete the credential
    await prisma.providerCredential.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting provider credential:", error);
    return NextResponse.json(
      { error: "Failed to delete provider credential" },
      { status: 500 }
    );
  }
}
