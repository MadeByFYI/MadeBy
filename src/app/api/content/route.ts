import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ContentType } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const {
      title,
      description,
      contentType,
      creatorName,
      originalUrl,
      thumbnailUrl,
      attribution,
      collaborators,
      aiToolsUsed,
      owner,
    } = body;

    // Validate required fields
    if (!title || !creatorName || !contentType) {
      return NextResponse.json(
        { error: "Title, creator name, and content type are required" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!["HUMAN", "AI", "WITH_AI"].includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const content = await prisma.content.create({
      data: {
        title,
        description: description || null,
        contentType: contentType as ContentType,
        creatorName,
        originalUrl: originalUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        attribution: attribution || null,
        collaborators: collaborators || null,
        aiToolsUsed: aiToolsUsed || null,
        owner: owner || null,
        userId: session?.user?.id || null,
      },
    });

    return NextResponse.json({ id: content.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating content:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}
