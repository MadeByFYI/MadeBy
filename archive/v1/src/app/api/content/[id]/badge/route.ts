import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBadge } from "@/lib/badge-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const greyscale = searchParams.get("greyscale") === "true";

    const content = await prisma.content.findUnique({
      where: { id },
      select: { contentType: true },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Get base URL from request
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const badgeBuffer = await generateBadge({
      contentType: content.contentType,
      contentId: id,
      baseUrl,
      greyscale,
    });

    const filename = greyscale ? `madeby-badge-grey-${id}.png` : `madeby-badge-${id}.png`;

    return new NextResponse(new Uint8Array(badgeBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error generating badge:", error);
    return NextResponse.json(
      { error: "Failed to generate badge" },
      { status: 500 }
    );
  }
}
