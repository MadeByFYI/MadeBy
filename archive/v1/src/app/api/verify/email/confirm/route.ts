import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST: Confirm email verification via token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Find email by token
    const email = await prisma.identityEmail.findUnique({
      where: { verificationToken: token },
    });

    if (!email) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    if (email.verified === "VERIFIED") {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Check if token expired (24 hours)
    if (email.verificationSentAt) {
      const expiresAt = new Date(email.verificationSentAt.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        return NextResponse.json({ error: "Verification token expired. Please request a new one." }, { status: 400 });
      }
    }

    // Mark as verified
    const updated = await prisma.identityEmail.update({
      where: { id: email.id },
      data: {
        verified: "VERIFIED",
        verificationToken: null,
        verificationSentAt: null,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      email: updated.email,
    });
  } catch (error) {
    console.error("Error confirming email verification:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}
