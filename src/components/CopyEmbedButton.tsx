"use client";

import { useState } from "react";

type ContentType = "HUMAN" | "AI" | "WITH_AI";

interface CopyEmbedButtonProps {
  contentType: ContentType;
  verifyUrl: string;
  className?: string;
}

const BADGE_CONFIG = {
  HUMAN: {
    label: "MADE BY",
    letters: "HI",
    bgColor: "#ecfeff",
    borderColor: "#06b6d4",
    textColor: "#155e75",
    primaryColor: "#06b6d4",
  },
  AI: {
    label: "MADE BY",
    letters: "AI",
    bgColor: "#fdf2f8",
    borderColor: "#ec4899",
    textColor: "#9d174d",
    primaryColor: "#ec4899",
  },
  WITH_AI: {
    label: "MADE WITH",
    letters: "AI",
    bgColor: "#faf5ff",
    borderColor: "#8b5cf6",
    textColor: "#5b21b6",
    primaryColor: "#8b5cf6",
  },
};

export function CopyEmbedButton({ contentType, verifyUrl, className = "" }: CopyEmbedButtonProps) {
  const [copied, setCopied] = useState(false);
  const config = BADGE_CONFIG[contentType];

  const embedCode = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;" title="View declaration on MadeBy.fyi">
  <svg width="152" height="176" viewBox="0 0 152 176" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="149" height="173" rx="14.5" fill="${config.bgColor}" stroke="${config.borderColor}" stroke-width="3"/>
    <text x="76" y="28" text-anchor="middle" fill="${config.textColor}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${config.label}</text>
    <rect x="16" y="40" width="120" height="120" rx="12" fill="${config.primaryColor}"/>
    <text x="76" y="104" text-anchor="middle" dominant-baseline="central" fill="white" font-family="Arial, sans-serif" font-size="60" font-weight="bold">${config.letters}</text>
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
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        copied
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      } ${className}`}
      title={copied ? "Copied!" : "Copy embed code"}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )}
      {copied ? "Copied!" : "Embed"}
    </button>
  );
}
