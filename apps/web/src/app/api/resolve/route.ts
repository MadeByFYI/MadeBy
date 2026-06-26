import { NextResponse } from "next/server";
import { demoRegistry, resolveByFingerprint } from "@madeby/registry";

export const dynamic = "force-dynamic";

// Asker-pull: GET /api/resolve?fp=<algorithm>:<value> → the provenance of that content.
// v0 uses the demo registry; the real (Drizzle/Neon) store wires in post-provisioning (#7),
// populated by ingestion (#10).
export function GET(req: Request) {
  const fp = new URL(req.url).searchParams.get("fp");
  if (!fp || !fp.includes(":")) {
    return NextResponse.json({ error: "pass ?fp=<algorithm>:<value>" }, { status: 400 });
  }
  const idx = fp.indexOf(":");
  const algorithm = fp.slice(0, idx);
  const value = fp.slice(idx + 1);

  const resolution = resolveByFingerprint(demoRegistry(), algorithm, value);
  if (!resolution) {
    // "No record" is a designed state, not an error → point to the analyzer.
    return NextResponse.json(
      { notFound: true, message: "No record for this content yet — analyze it.", analyze: "/analyze" },
      { status: 404 },
    );
  }
  return NextResponse.json(resolution);
}
