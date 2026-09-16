import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: List all active legal representations
export async function GET() {
  try {
    const representations = await prisma.legalRepresentation.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        assertionLevel: true,
        name: true,
        shortDescription: true,
        assertionText: true,
        fullLegalText: true,
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ representations });
  } catch (error) {
    console.error("Error fetching representations:", error);
    return NextResponse.json(
      { error: "Failed to fetch representations" },
      { status: 500 }
    );
  }
}
