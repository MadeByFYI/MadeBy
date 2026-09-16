// Live-served badge SVG. Dependency-free so it runs anywhere — this Next app
// now, the Cloudflare Worker (workers/badge) later. The badge is a HEADLINE + POINTER, never
// standalone proof: it carries a glanceable facet and is always embedded as a link to the
// authoritative resolver page (the link lives in the markdown snippet, not the image).
//
// Shields-style two-capsule layout: [ madeby.fyi ][ <message> ]. The left capsule is the brand
// (and a real domain); the right capsule is the mix-led headline, tier-colored.

export interface BadgeInput {
  /** left capsule — the brand / domain */
  label?: string;
  /** right capsule — the headline (e.g. "62% human · 38% AI", or a tier word) */
  message: string;
  /** right-capsule color (use tierColor) */
  color?: string;
}

/** Tier → color. v0 mostly renders `asserted` (estimated) until the verification path (#18). */
export const TIER_COLORS: Record<string, string> = {
  asserted: "#6a737d", // grey — estimated / unverified
  sworn: "#8957e5", // purple — legally attested
  verified: "#3fb950", // green — verified identity
  bound: "#1f6feb", // blue — cryptographically bound
};

export function tierColor(tier: string): string {
  return TIER_COLORS[tier] ?? TIER_COLORS.asserted!;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Rough text width at 11px Verdana — good enough for capsule sizing (shields does the same). */
function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch === " " ? 3.5 : /[iljt.,'!|]/.test(ch) ? 3 : /[mwMW%]/.test(ch) ? 9 : 6.5;
  return Math.ceil(w);
}

const H = 20;
const PAD = 10;

export function renderBadge({ label = "madeby.fyi", message, color = TIER_COLORS.asserted }: BadgeInput): string {
  const lw = textWidth(label) + PAD;
  const mw = textWidth(message) + PAD;
  const w = lw + mw;
  const aria = `${label}: ${message}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" role="img" aria-label="${escapeXml(aria)}">
  <title>${escapeXml(aria)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="${H}" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="${H}" fill="#0b0f17"/>
    <rect x="${lw}" width="${mw}" height="${H}" fill="${color}"/>
    <rect width="${w}" height="${H}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${(lw / 2).toFixed(1)}" y="14">${escapeXml(label)}</text>
    <text x="${(lw + mw / 2).toFixed(1)}" y="14">${escapeXml(message)}</text>
  </g>
</svg>`;
}

/**
 * Build the mix-led headline message. Leads with the human/AI split (the ego-number); falls
 * back to a tier word when there's no usable signal (degrade to the tier, never fake precision).
 */
export function mixMessage(opts: { humanPercent?: number; aiInvolvedPercent?: number; tier?: string }): string {
  const { humanPercent, aiInvolvedPercent } = opts;
  if (humanPercent === undefined || aiInvolvedPercent === undefined) {
    return opts.tier ?? "estimated";
  }
  return `${Math.round(humanPercent)}% human · ${Math.round(aiInvolvedPercent)}% AI`;
}
