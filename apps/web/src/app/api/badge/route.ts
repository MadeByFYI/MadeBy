import { readGitLog, analyzeCommits } from "@madeby/analyzer";
import { renderBadge, mixMessage, tierColor } from "@madeby/badge";

// Reads git → Node runtime, never prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// v0: live-serves the badge for the repo this app runs in (the dogfood path). The production
// badge (real registry, edge-served) is the Cloudflare Worker in workers/badge.
export function GET() {
  const commits = readGitLog(process.cwd());

  let message: string;
  let color: string;
  if (commits.length === 0) {
    message = mixMessage({ tier: "no data" });
    color = tierColor("asserted");
  } else {
    const r = analyzeCommits(commits);
    message = mixMessage({ humanPercent: r.percent.human, aiInvolvedPercent: r.aiInvolvedPercent, tier: r.tier });
    color = tierColor(r.tier);
  }

  return new Response(renderBadge({ message, color }), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
