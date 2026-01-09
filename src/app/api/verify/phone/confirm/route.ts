import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST: Confirm verification code
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phoneId, code } = body;

    if (!phoneId || !code) {
      return NextResponse.json({ error: "Phone ID and code required" }, { status: 400 });
    }

    // Verify ownership
    const phone = await prisma.identityPhone.findUnique({
      where: { id: phoneId },
      include: { identity: true },
    });

    if (!phone || phone.identity.userId !== session.user.id) {
      return NextResponse.json({ error: "Phone not found" }, { status: 404 });
    }

    if (phone.verified === "VERIFIED") {
      return NextResponse.json({ error: "Phone already verified" }, { status: 400 });
    }

    if (!phone.verificationCode || !phone.verificationSentAt) {
      return NextResponse.json({ error: "No verification code sent. Please request a new code." }, { status: 400 });
    }

    // Check if code expired (10 minutes)
    const expiresAt = new Date(phone.verificationSentAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: "Verification code expired. Please request a new code." }, { status: 400 });
    }

    // Check if too many attempts (max 3)
    if (phone.verificationAttempts >= 3) {
      return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 400 });
    }

    // Check if code matches
    if (phone.verificationCode !== code) {
      // Increment attempts
      await prisma.identityPhone.update({
        where: { id: phoneId },
        data: { verificationAttempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Mark as verified
    const updated = await prisma.identityPhone.update({
      where: { id: phoneId },
      data: {
        verified: "VERIFIED",
        verificationCode: null,
        verificationSentAt: null,
        verificationAttempts: 0,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      phone: updated,
    });
  } catch (error) {
    console.error("Error confirming phone verification:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
