import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import dns from "dns/promises";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domainId } = await request.json();

    if (!domainId) {
      return NextResponse.json(
        { error: "Domain ID is required" },
        { status: 400 }
      );
    }

    // Find the domain and verify ownership
    const domain = await prisma.identityDomain.findUnique({
      where: { id: domainId },
      include: { identity: true },
    });

    if (!domain || domain.identity.userId !== session.user.id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (!domain.verificationToken) {
      return NextResponse.json(
        { error: "No verification token generated" },
        { status: 400 }
      );
    }

    if (domain.verified === "VERIFIED") {
      return NextResponse.json({ verified: true, message: "Already verified" });
    }

    try {
      // Check for TXT record at _madeby-verify.{domain}
      const recordHost = `_madeby-verify.${domain.domain}`;
      const records = await dns.resolveTxt(recordHost);

      // Flatten the TXT records (they can be arrays of strings)
      const flatRecords = records.map((r) => r.join(""));

      const expectedValue = `madeby-verify=${domain.verificationToken}`;

      if (flatRecords.includes(expectedValue)) {
        // Update domain as verified
        await prisma.identityDomain.update({
          where: { id: domainId },
          data: {
            verified: "VERIFIED",
            verifiedAt: new Date(),
          },
        });

        return NextResponse.json({
          verified: true,
          message: "Domain verified successfully",
        });
      }

      return NextResponse.json({
        verified: false,
        message: `TXT record not found. Looking for "${expectedValue}" at ${recordHost}`,
      });
    } catch (dnsError) {
      // DNS lookup failed (no records found, domain doesn't exist, etc.)
      console.error("DNS lookup error:", dnsError);
      return NextResponse.json({
        verified: false,
        message: "DNS lookup failed. Make sure the TXT record is properly configured.",
      });
    }
  } catch (error) {
    console.error("Error verifying domain:", error);
    return NextResponse.json(
      { error: "Failed to verify domain" },
      { status: 500 }
    );
  }
}
