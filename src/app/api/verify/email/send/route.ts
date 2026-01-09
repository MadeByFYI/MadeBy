import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

// Generate a verification token
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// POST: Send verification email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership
    const email = await prisma.identityEmail.findUnique({
      where: { id: emailId },
      include: { identity: true },
    });

    if (!email || email.identity.userId !== session.user.id) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    if (email.verified === "VERIFIED") {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Generate verification token
    const token = generateToken();

    // Store the token
    await prisma.identityEmail.update({
      where: { id: emailId },
      data: {
        verificationToken: token,
        verificationSentAt: new Date(),
        verified: "PENDING",
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify/email?token=${token}`;

    // Send via Resend (if configured)
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@madeby.fyi",
        to: email.email,
        subject: "Verify your email address - MadeBy",
        html: `
          <h1>Verify your email address</h1>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this verification, you can safely ignore this email.</p>
        `,
      });

      return NextResponse.json({
        success: true,
        message: "Verification email sent. Check your inbox.",
      });
    }

    // Development mode: return URL in response (remove in production!)
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        message: "Verification email generated (Resend not configured)",
        devToken: token, // Only in development!
        devUrl: verificationUrl,
      });
    }

    return NextResponse.json(
      { error: "Email verification not configured. Please set up Resend." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error sending email verification:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
