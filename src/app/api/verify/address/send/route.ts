import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Generate a 6-character alphanumeric code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST: Request address verification (send postal mail)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's identity and address
    const identity = await prisma.identity.findUnique({
      where: { userId: session.user.id },
      include: { mailingAddress: true },
    });

    if (!identity || !identity.mailingAddress) {
      return NextResponse.json({ error: "No address found" }, { status: 404 });
    }

    const address = identity.mailingAddress;

    if (address.verified === "VERIFIED") {
      return NextResponse.json({ error: "Address already verified" }, { status: 400 });
    }

    // Generate verification code
    const code = generateCode();

    // Store the code
    await prisma.mailingAddress.update({
      where: { id: address.id },
      data: {
        verificationCode: code,
        verificationSentAt: new Date(),
        verified: "PENDING",
      },
    });

    // Format address for mailing
    const formattedAddress = [
      address.street1,
      address.street2,
      `${address.city}${address.state ? `, ${address.state}` : ""} ${address.postalCode}`,
      address.country,
    ].filter(Boolean).join("\n");

    // Send via Lob (if configured)
    const lobKey = process.env.LOB_API_KEY;

    if (lobKey) {
      const Lob = (await import("lob")).default;
      const lob = new Lob({ apiKey: lobKey });

      await lob.letters.create({
        description: "MadeBy Address Verification",
        to: {
          name: identity.displayName || "Resident",
          address_line1: address.street1,
          address_line2: address.street2 || undefined,
          address_city: address.city,
          address_state: address.state || undefined,
          address_zip: address.postalCode,
          address_country: address.country,
        },
        from: {
          name: "MadeBy",
          address_line1: process.env.LOB_FROM_ADDRESS_LINE1 || "123 Main St",
          address_city: process.env.LOB_FROM_CITY || "San Francisco",
          address_state: process.env.LOB_FROM_STATE || "CA",
          address_zip: process.env.LOB_FROM_ZIP || "94105",
          address_country: "US",
        },
        file: `<html>
          <body style="font-family: Arial, sans-serif; padding: 40px;">
            <h1>MadeBy Address Verification</h1>
            <p>Your verification code is:</p>
            <h2 style="font-size: 36px; letter-spacing: 8px; background: #f0f0f0; padding: 20px; text-align: center;">${code}</h2>
            <p>Enter this code at madeby.fyi to verify your address.</p>
            <p>This code expires in 30 days.</p>
          </body>
        </html>`,
        color: false,
      });

      return NextResponse.json({
        success: true,
        message: "Verification letter has been mailed to your address. Please allow 5-7 business days for delivery.",
      });
    }

    // Development mode: return code in response (remove in production!)
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        message: "Verification code generated (Lob not configured)",
        devCode: code, // Only in development!
        devAddress: formattedAddress,
      });
    }

    return NextResponse.json(
      { error: "Address verification not configured. Please set up Lob." },
      { status: 503 }
    );
  } catch (error) {
    console.error("Error sending address verification:", error);
    return NextResponse.json(
      { error: "Failed to send verification" },
      { status: 500 }
    );
  }
}
