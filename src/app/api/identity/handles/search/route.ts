import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase();

    if (!query || query.length < 2) {
      return NextResponse.json({ handles: [] });
    }

    // Remove @ prefix if present
    const searchQuery = query.startsWith("@") ? query.slice(1) : query;

    // Search for identities with matching handles or display names
    const identities = await prisma.identity.findMany({
      where: {
        AND: [
          { handle: { not: null } },
          {
            OR: [
              { handle: { contains: searchQuery, mode: "insensitive" } },
              { displayName: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        handle: true,
        displayName: true,
      },
      take: 10,
      orderBy: [
        // Prioritize exact matches
        { handle: "asc" },
      ],
    });

    const handles = identities
      .filter((identity) => identity.handle !== null)
      .map((identity) => ({
        handle: identity.handle,
        displayName: identity.displayName,
      }));

    return NextResponse.json({ handles });
  } catch (error) {
    console.error("Error searching handles:", error);
    return NextResponse.json(
      { error: "Failed to search handles" },
      { status: 500 }
    );
  }
}
