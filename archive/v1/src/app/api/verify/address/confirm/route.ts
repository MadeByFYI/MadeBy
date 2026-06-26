import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";

// POST: Confirm address verification code
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Verification code required" }, { status: 400 });
    }

    // Get user's identity and address
    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: { mailingAddress: true },
    });

    if (!identity || !identity.mailingAddress) {
      return NextResponse.json({ error: "No address found" }, { status: 404 });
    }

    const address = identity.mailingAddress;

    if (address.verified === "VERIFIED") {
      return NextResponse.json({ error: "Address already verified" }, { status: 400 });
    }

    if (!address.verificationCode || !address.verificationSentAt) {
      return NextResponse.json({ error: "No verification code sent. Please request a new one." }, { status: 400 });
    }

    // Check if code expired (30 days for postal mail)
    const expiresAt = new Date(address.verificationSentAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: "Verification code expired. Please request a new one." }, { status: 400 });
    }

    // Check if code matches (case-insensitive)
    if (address.verificationCode.toUpperCase() !== code.toUpperCase()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Mark as verified
    const updated = await prisma.mailingAddress.update({
      where: { id: address.id },
      data: {
        verified: "VERIFIED",
        verificationCode: null,
        verificationSentAt: null,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      address: updated,
    });
  } catch (error) {
    console.error("Error confirming address verification:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
