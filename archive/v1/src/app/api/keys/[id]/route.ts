import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteApiKey, revokeApiKey } from "@/lib/api-keys";

// DELETE: Delete/revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check for ?permanent=true query param
    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "true";

    let success: boolean;
    if (permanent) {
      // Permanently delete the key
      success = await deleteApiKey(id, session.user.id);
    } else {
      // Just revoke the key (keeps record for audit)
      success = await revokeApiKey(id, session.user.id);
    }

    if (!success) {
      return NextResponse.json(
        { error: "API key not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: permanent ? "API key deleted permanently" : "API key revoked",
    });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
