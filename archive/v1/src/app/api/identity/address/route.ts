import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-keys";
import { Visibility } from "@/generated/prisma/client";

// GET: Get mailing address for current user's identity
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: { mailingAddress: true },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    return NextResponse.json(identity.mailingAddress);
  } catch (error) {
    console.error("Error fetching address:", error);
    return NextResponse.json(
      { error: "Failed to fetch address" },
      { status: 500 }
    );
  }
}

// POST: Create mailing address
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { street1, street2, city, state, postalCode, country, visibility } = body;

    // Validate required fields
    if (!street1 || !city || !postalCode || !country) {
      return NextResponse.json(
        { error: "Street, city, postal code, and country are required" },
        { status: 400 }
      );
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: { mailingAddress: true },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    if (identity.mailingAddress) {
      return NextResponse.json(
        { error: "Address already exists. Use PATCH to update." },
        { status: 409 }
      );
    }

    const address = await prisma.mailingAddress.create({
      data: {
        identityId: identity.id,
        street1,
        street2: street2 || null,
        city,
        state: state || null,
        postalCode,
        country,
        visibility: (visibility as Visibility) || "PRIVATE",
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}

// PATCH: Update mailing address
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { street1, street2, city, state, postalCode, country, visibility } = body;

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: { mailingAddress: true },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found. Create one first." },
        { status: 404 }
      );
    }

    if (!identity.mailingAddress) {
      return NextResponse.json(
        { error: "No address found. Use POST to create." },
        { status: 404 }
      );
    }

    const address = await prisma.mailingAddress.update({
      where: { id: identity.mailingAddress.id },
      data: {
        ...(street1 !== undefined && { street1 }),
        ...(street2 !== undefined && { street2: street2 || null }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state: state || null }),
        ...(postalCode !== undefined && { postalCode }),
        ...(country !== undefined && { country }),
        ...(visibility !== undefined && { visibility: visibility as Visibility }),
      },
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// DELETE: Remove mailing address
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await prisma.identity.findUnique({
      where: { userId: authResult.userId },
      include: { mailingAddress: true },
    });

    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found" },
        { status: 404 }
      );
    }

    if (!identity.mailingAddress) {
      return NextResponse.json(
        { error: "No address found" },
        { status: 404 }
      );
    }

    await prisma.mailingAddress.delete({
      where: { id: identity.mailingAddress.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
