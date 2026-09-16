import { describe, it, expect } from "vitest";
import { renderBadge, mixMessage, tierColor, TIER_COLORS } from "./index";

describe("renderBadge", () => {
  it("produces an SVG with the brand label and the message", () => {
    const svg = renderBadge({ message: "62% human · 38% AI" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("madeby.fyi"); // default brand label
    expect(svg).toContain("62% human · 38% AI");
    expect((svg.match(/<text /g) ?? []).length).toBe(2); // two capsules
    expect(svg).toContain('role="img"');
  });

  it("XML-escapes the message (no injection)", () => {
    const svg = renderBadge({ message: 'a & b <x> "q"' });
    expect(svg).toContain("a &amp; b &lt;x&gt; &quot;q&quot;");
    expect(svg).not.toContain("<x>");
  });

  it("width grows with message length", () => {
    const short = renderBadge({ message: "AI" });
    const long = renderBadge({ message: "100% human · 100% AI" });
    const wOf = (s: string) => Number(s.match(/width="(\d+)"/)![1]);
    expect(wOf(long)).toBeGreaterThan(wOf(short));
  });
});

describe("tierColor + mixMessage", () => {
  it("maps known tiers and falls back to asserted", () => {
    expect(tierColor("bound")).toBe(TIER_COLORS.bound);
    expect(tierColor("nonsense")).toBe(TIER_COLORS.asserted);
  });

  it("leads with the human/AI mix when available", () => {
    expect(mixMessage({ humanPercent: 38, aiInvolvedPercent: 62 })).toBe("38% human · 62% AI");
  });

  it("degrades to the tier word when there's no usable signal (never fakes precision)", () => {
    expect(mixMessage({ tier: "estimated" })).toBe("estimated");
    expect(mixMessage({})).toBe("estimated");
  });
});
