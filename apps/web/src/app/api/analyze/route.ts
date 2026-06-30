import { NextResponse } from "next/server";
import { analyzeRepo, isAnalyzeError } from "@madeby/analyzer";

// Clones + analyzes a public repo → Node runtime, never prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/analyze?repo=github.com/owner/repo — shallow-clone the public repo, analyze, return
// the breakdown. Nearly stateless (OPERATIONS §3); persistent/at-scale ingestion is #10.
export async function GET(req: Request) {
  const repo = new URL(req.url).searchParams.get("repo");
  if (!repo) {
    return NextResponse.json({ error: "pass ?repo=<public repo url>" }, { status: 400 });
  }
  const result = await analyzeRepo(repo);
  if (isAnalyzeError(result)) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}
