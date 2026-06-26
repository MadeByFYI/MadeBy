// The copy-badge affordance (STRATEGY.md §5). The badge is live-served by madeby.fyi and
// ALWAYS wrapped in a link to the authoritative resolver page — a pointer, never standalone
// proof. The live SVG renders the numbers server-side, so the snippet carries no forgeable data.
// (The badge service itself is the producer-push work, #6.)

const BASE = "https://madeby.fyi";

export function badgeSnippet(owner: string, repo: string): string {
  const subject = `${owner}/${repo}`;
  return `[![madeby.fyi](${BASE}/b/${subject}.svg)](${BASE}/${subject})`;
}
