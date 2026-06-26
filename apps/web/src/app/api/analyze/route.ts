import { NextResponse } from "next/server";
import { readGitLog, analyzeCommits } from "@madeby/analyzer";

// Reads git → Node runtime, never prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// v0: analyzes the repo this app runs in (the dogfood path). Arbitrary public-repo analysis
// (shallow clone via the GitHub App) is ingestion's job (#10).
export function GET() {
  const commits = readGitLog(process.cwd());
  if (commits.length === 0) {
    return NextResponse.json(
      { error: "analysis unavailable — no git history available in this environment" },
      { status: 503 },
    );
  }
  return NextResponse.json(analyzeCommits(commits));
}
