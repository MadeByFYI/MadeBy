import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { AIProvider, CredentialType } from "@/generated/prisma/client";
import crypto from "crypto";

// Simple encryption for API keys (in production, use a proper secrets manager)
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "default-key-change-in-production-32";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function getKeyFingerprint(apiKey: string): string {
  // Create a fingerprint from the first and last 4 chars
  const prefix = apiKey.substring(0, 10);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}...${suffix}`;
}

// GET: Fetch provider credentials for current user's identity
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: {
        providerCredentials: {
          select: {
            id: true,
            provider: true,
            credentialType: true,
            keyFingerprint: true,
            isActive: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!identity) {
      return NextResponse.json({ error: "Identity not found" }, { status: 404 });
    }

    return NextResponse.json(identity.providerCredentials);
  } catch (error) {
    console.error("Error fetching provider credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider credentials" },
      { status: 500 }
    );
  }
}

// POST: Add a new provider credential
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, credentialType } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider and API key are required" },
        { status: 400 }
      );
    }

    // Validate the API key format based on provider
    if (provider === "ANTHROPIC") {
      if (credentialType === "ADMIN_API_KEY" && !apiKey.startsWith("sk-ant-admin")) {
        return NextResponse.json(
          { error: "Invalid Anthropic Admin API key format. Should start with 'sk-ant-admin'" },
          { status: 400 }
        );
      }
    }

    // Get user's identity
    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create an identity first." },
        { status: 404 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);
    const fingerprint = getKeyFingerprint(apiKey);

    // Upsert the credential (replace if exists for same provider/type)
    const credential = await prisma.providerCredential.upsert({
      where: {
        identityId_provider_credentialType: {
          identityId: identity.id,
          provider: provider as AIProvider,
          credentialType: (credentialType as CredentialType) || "ADMIN_API_KEY",
        },
      },
      update: {
        encryptedKey,
        keyFingerprint: fingerprint,
        isActive: true,
        lastUsedAt: null,
      },
      create: {
        identityId: identity.id,
        provider: provider as AIProvider,
        credentialType: (credentialType as CredentialType) || "ADMIN_API_KEY",
        encryptedKey,
        keyFingerprint: fingerprint,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        credentialType: true,
        keyFingerprint: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    console.error("Error creating provider credential:", error);
    return NextResponse.json(
      { error: "Failed to create provider credential" },
      { status: 500 }
    );
  }
}
