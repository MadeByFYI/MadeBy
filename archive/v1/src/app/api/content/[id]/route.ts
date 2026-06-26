import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { ContentType, HashAlgorithm, HashTarget } from "@/generated/prisma/client";

// Valid hash algorithms
const VALID_HASH_ALGORITHMS = ["SHA256", "SHA384", "SHA512", "SHA3_256", "SHA3_512", "BLAKE2B", "BLAKE3", "MD5"];
const VALID_HASH_TARGETS = ["FILE", "URL_CONTENT", "TEXT_CONTENT", "COMBINED"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        representationAcceptance: {
          include: {
            representation: {
              select: {
                code: true,
                assertionLevel: true,
                name: true,
                shortDescription: true,
                assertionText: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

// PATCH: Update content declaration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.content.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== authResult.userId) {
      return NextResponse.json(
        { error: "You can only update your own content" },
        { status: 403 }
      );
    }

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
      contentHash,
      hashAlgorithm,
      hashTarget,
      hashInputSize,
      hashInputFilename,
      gitCommitHash,
      gitRepositoryUrl,
    } = body;

    // Validate content type if provided
    if (contentType && !["HUMAN", "AI", "WITH_AI"].includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Validate hash fields if provided
    if (contentHash) {
      if (hashAlgorithm && !VALID_HASH_ALGORITHMS.includes(hashAlgorithm)) {
        return NextResponse.json(
          { error: "Invalid hash algorithm" },
          { status: 400 }
        );
      }
      if (hashTarget && !VALID_HASH_TARGETS.includes(hashTarget)) {
        return NextResponse.json(
          { error: "Invalid hash target" },
          { status: 400 }
        );
      }
    }

    const content = await prisma.content.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(contentType !== undefined && { contentType: contentType as ContentType }),
        ...(creatorName !== undefined && { creatorName }),
        ...(originalUrl !== undefined && { originalUrl: originalUrl || null }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl: thumbnailUrl || null }),
        ...(attribution !== undefined && { attribution: attribution || null }),
        ...(collaborators !== undefined && { collaborators: collaborators || null }),
        ...(aiToolsUsed !== undefined && { aiToolsUsed: aiToolsUsed || null }),
        ...(owner !== undefined && { owner: owner || null }),
        ...(contentHash !== undefined && {
          contentHash: contentHash || null,
          hashCreatedAt: contentHash ? new Date() : null,
        }),
        ...(hashAlgorithm !== undefined && {
          hashAlgorithm: hashAlgorithm ? (hashAlgorithm as HashAlgorithm) : null,
        }),
        ...(hashTarget !== undefined && {
          hashTarget: hashTarget ? (hashTarget as HashTarget) : null,
        }),
        ...(hashInputSize !== undefined && {
          hashInputSize: hashInputSize ? parseInt(hashInputSize, 10) : null,
        }),
        ...(hashInputFilename !== undefined && {
          hashInputFilename: hashInputFilename || null,
        }),
        ...(gitCommitHash !== undefined && {
          gitCommitHash: gitCommitHash || null,
        }),
        ...(gitRepositoryUrl !== undefined && {
          gitRepositoryUrl: gitRepositoryUrl || null,
        }),
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}

// DELETE: Delete content declaration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.content.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== authResult.userId) {
      return NextResponse.json(
        { error: "You can only delete your own content" },
        { status: 403 }
      );
    }

    await prisma.content.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
