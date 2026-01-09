import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST: Send verification code via SMS or voice call
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phoneId, method } = body; // method: "sms" or "call"

    if (!phoneId) {
      return NextResponse.json({ error: "Phone ID required" }, { status: 400 });
    }

    if (!method || !["sms", "call"].includes(method)) {
      return NextResponse.json({ error: "Invalid method. Use 'sms' or 'call'" }, { status: 400 });
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

    // Generate verification code
    const code = generateCode();

    // Store the code
    await prisma.identityPhone.update({
      where: { id: phoneId },
      data: {
        verificationCode: code,
        verificationSentAt: new Date(),
        verificationAttempts: 0,
        verified: "PENDING",
      },
    });

    // Send via Twilio (if configured)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioPhone) {
      const twilio = await import("twilio");
      const client = twilio.default(twilioSid, twilioToken);

      if (method === "sms") {
        await client.messages.create({
          body: `Your MadeBy verification code is: ${code}`,
          from: twilioPhone,
          to: phone.phone,
        });
      } else {
        // Voice call
        await client.calls.create({
          twiml: `<Response><Say voice="alice">Your MadeBy verification code is: ${code.split("").join(" ")}. I repeat: ${code.split("").join(" ")}.</Say></Response>`,
          from: twilioPhone,
          to: phone.phone,
        });
      }

      return NextResponse.json({
        success: true,
        message: method === "sms"
          ? "Verification code sent via SMS"
          : "You will receive a call with your verification code"
      });
    }

    // Development mode: return code in response (remove in production!)
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        message: "Verification code generated (Twilio not configured)",
        devCode: code // Only in development!
      });
    }

    return NextResponse.json(
      { error: "Phone verification not configured. Please set up Twilio." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error sending phone verification:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
