import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { ContentType, HashAlgorithm, HashTarget } from "@/generated/prisma";

// Valid hash algorithms
const VALID_HASH_ALGORITHMS = ["SHA256", "SHA384", "SHA512", "SHA3_256", "SHA3_512", "BLAKE2B", "BLAKE3", "MD5"];
const VALID_HASH_TARGETS = ["FILE", "URL_CONTENT", "TEXT_CONTENT", "COMBINED"];

// GET: List authenticated user's content declarations
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const contentType = url.searchParams.get("contentType");

    // Build query
    const where: { userId: string; contentType?: ContentType } = {
      userId: authResult.userId,
    };

    if (contentType && ["HUMAN", "AI", "WITH_AI"].includes(contentType)) {
      where.contentType = contentType as ContentType;
    }

    // Get total count and content
    const [total, contents] = await Promise.all([
      prisma.content.count({ where }),
      prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    return NextResponse.json({
      contents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + contents.length < total,
      },
    });
  } catch (error) {
    console.error("Error listing content:", error);
    return NextResponse.json(
      { error: "Failed to list content" },
      { status: 500 }
    );
  }
}

// POST: Create content declaration
export async function POST(request: NextRequest) {
  try {
    // Authenticate via session or API key
    const authResult = await authenticateRequest(request);
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
      // Hash fields
      contentHash,
      hashAlgorithm,
      hashTarget,
      hashInputSize,
      hashInputFilename,
      // Git fields
      gitCommitHash,
      gitRepositoryUrl,
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
        userId: authResult?.userId || null,
        // Hash fields
        contentHash: contentHash || null,
        hashAlgorithm: hashAlgorithm ? (hashAlgorithm as HashAlgorithm) : null,
        hashTarget: hashTarget ? (hashTarget as HashTarget) : null,
        hashCreatedAt: contentHash ? new Date() : null,
        hashInputSize: hashInputSize ? parseInt(hashInputSize, 10) : null,
        hashInputFilename: hashInputFilename || null,
        // Git fields
        gitCommitHash: gitCommitHash || null,
        gitRepositoryUrl: gitRepositoryUrl || null,
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
