import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSimpleBadge } from "@/lib/badge-generator";

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

    const badgeBuffer = await generateSimpleBadge(content.contentType, greyscale);

    const filename = greyscale ? `madeby-simple-grey-${id}.png` : `madeby-simple-${id}.png`;

    return new NextResponse(new Uint8Array(badgeBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error generating simple badge:", error);
    return NextResponse.json(
      { error: "Failed to generate badge" },
      { status: 500 }
    );
  }
}
