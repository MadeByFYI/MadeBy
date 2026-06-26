"use client";

import { useState } from "react";

type ContentType = "HUMAN" | "AI" | "WITH_AI";

interface EmbedCodeSectionProps {
  contentId: string;
  contentType: ContentType;
  verifyUrl: string;
}

const BADGE_CONFIG = {
  HUMAN: {
    label: "MADE BY",
    letters: "HI",
    bgColor: "#ecfeff",
    borderColor: "#06b6d4",
    textColor: "#155e75",
    primaryColor: "#06b6d4",
    title: "Made by 100% HI (Human Intelligence). Click to learn more at MadeBy.fyi",
    bottomText: "100% Human Intelligence",
    height: 196,
  },
  AI: {
    label: "MADE BY",
    letters: "AI",
    bgColor: "#fdf2f8",
    borderColor: "#ec4899",
    textColor: "#9d174d",
    primaryColor: "#ec4899",
    title: "Made by 100% AI Generated. Click to learn more at MadeBy.fyi",
    bottomText: "100% AI Generated",
    height: 196,
  },
  WITH_AI: {
    label: "MADE WITH",
    letters: "AI",
    bgColor: "#faf5ff",
    borderColor: "#8b5cf6",
    textColor: "#5b21b6",
    primaryColor: "#8b5cf6",
    title: "Made with AI. Click to learn more at MadeBy.fyi",
    bottomText: "Human + AI",
    height: 196,
  },
};

const GREYSCALE_CONFIG = {
  label: "", // Will be set from content type
  letters: "", // Will be set from content type
  bgColor: "#f5f5f5",
  borderColor: "#525252",
  textColor: "#525252",
  primaryColor: "#525252",
  title: "", // Will be set from content type
  bottomText: null as string | null, // Will be set from content type
  height: 176, // Will be set from content type
};

export function EmbedCodeSection({ contentId, contentType, verifyUrl }: EmbedCodeSectionProps) {
  const [copied, setCopied] = useState(false);
  const [greyscale, setGreyscale] = useState(false);

  const colorConfig = BADGE_CONFIG[contentType];
  const config = greyscale
    ? { ...GREYSCALE_CONFIG, label: colorConfig.label, letters: colorConfig.letters, title: colorConfig.title, bottomText: colorConfig.bottomText, height: colorConfig.height }
    : colorConfig;

  // Bottom text centered between colored square (ends at y=160) and bottom border (y=180 for 196 height badge)
  const bottomTextLine = config.bottomText
    ? `\n    <text x="76" y="178" text-anchor="middle" dominant-baseline="central" fill="${config.textColor}" font-family="Arial, sans-serif" font-size="11" font-weight="bold">${config.bottomText}</text>`
    : "";

  // "w/" prefix for WITH_AI badge - centered in rectangle between square's NW corner and "A"'s NW corner
  // Calculation: AI at (76,104), font 60px, AI width ~51px, A height ~43px
  // A's NW corner: (50.5, 82.4), rectangle center: (33, 61)
  const withAiPrefix = contentType === "WITH_AI"
    ? `\n    <text x="33" y="61" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="24" font-weight="bold">w/</text>`
    : "";

  const embedCode = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;" title="${config.title}">
  <svg width="152" height="${config.height}" viewBox="0 0 152 ${config.height}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="149" height="${config.height - 3}" rx="14.5" fill="${config.bgColor}" stroke="${config.borderColor}" stroke-width="3"/>
    <text x="76" y="28" text-anchor="middle" fill="${config.textColor}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${config.label}</text>
    <rect x="16" y="40" width="120" height="120" rx="12" fill="${config.primaryColor}"/>
    <text x="76" y="104" text-anchor="middle" dominant-baseline="central" fill="white" font-family="Arial, sans-serif" font-size="60" font-weight="bold">${config.letters}</text>${withAiPrefix}${bottomTextLine}
  </svg>
</a>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Embed on Your Website</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add this badge to your website. It&apos;s a self-contained SVG that requires no external resources.
          </p>

          {/* Greyscale Toggle */}
          <div className="mb-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <span className="text-sm text-gray-600">Color Style:</span>
              <button
                type="button"
                onClick={() => setGreyscale(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !greyscale
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Color
              </button>
              <button
                type="button"
                onClick={() => setGreyscale(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  greyscale
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Greyscale
              </button>
            </label>
          </div>

          {/* Preview */}
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-500">Preview:</span>
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", textDecoration: "none" }} title={config.title}>
              <svg width="152" height={config.height} viewBox={`0 0 152 ${config.height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1.5" y="1.5" width="149" height={config.height - 3} rx="14.5" fill={config.bgColor} stroke={config.borderColor} strokeWidth="3"/>
                <text x="76" y="28" textAnchor="middle" fill={config.textColor} fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold">{config.label}</text>
                <rect x="16" y="40" width="120" height="120" rx="12" fill={config.primaryColor}/>
                <text x="76" y="104" textAnchor="middle" dominantBaseline="central" fill="white" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold">{config.letters}</text>
                {contentType === "WITH_AI" && (
                  <text x="33" y="61" textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.9)" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold">w/</text>
                )}
                {config.bottomText && (
                  <text x="76" y="178" textAnchor="middle" dominantBaseline="central" fill={config.textColor} fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold">{config.bottomText}</text>
                )}
              </svg>
            </a>
          </div>

          {/* Code */}
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
              {embedCode}
            </pre>
            <button
              onClick={handleCopy}
              className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
