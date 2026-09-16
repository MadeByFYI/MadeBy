"use client";

import { useState } from "react";
import Image from "next/image";

type ContentType = "HUMAN" | "AI" | "WITH_AI";

interface BadgeDownloadSectionProps {
  contentId: string;
  contentType: ContentType;
}

const CONTENT_TYPE_CONFIG = {
  HUMAN: {
    gradient: "from-cyan-400 to-cyan-600",
    badgeHeight: 196,
    simpleBadgeHeight: 196,
  },
  AI: {
    gradient: "from-pink-400 to-pink-600",
    badgeHeight: 196,
    simpleBadgeHeight: 196,
  },
  WITH_AI: {
    gradient: "from-purple-400 to-purple-600",
    badgeHeight: 196,
    simpleBadgeHeight: 196,
  },
};

export function BadgeDownloadSection({ contentId, contentType }: BadgeDownloadSectionProps) {
  const [greyscale, setGreyscale] = useState(false);
  const config = CONTENT_TYPE_CONFIG[contentType];

  const badgeUrl = `/api/content/${contentId}/badge${greyscale ? "?greyscale=true" : ""}`;
  const simpleBadgeUrl = `/api/content/${contentId}/badge-simple${greyscale ? "?greyscale=true" : ""}`;

  const badgeFilename = greyscale ? `madeby-badge-grey-${contentId}.png` : `madeby-badge-${contentId}.png`;
  const simpleBadgeFilename = greyscale ? `madeby-simple-grey-${contentId}.png` : `madeby-simple-${contentId}.png`;

  return (
    <div className="p-8">
      {/* Greyscale Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-3 bg-gray-50 rounded-xl p-2">
          <span className="text-sm text-gray-600 pl-2">Style:</span>
          <button
            type="button"
            onClick={() => setGreyscale(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !greyscale
                ? `bg-gradient-to-r ${config.gradient} text-white`
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Color
          </button>
          <button
            type="button"
            onClick={() => setGreyscale(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              greyscale
                ? "bg-gray-700 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Greyscale
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-center items-start gap-8 md:gap-12">
        {/* Full Badge with QR */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 mb-4">With QR Code</p>
          <div className="relative mb-6">
            <div className={`absolute inset-0 ${greyscale ? "bg-gray-400" : `bg-gradient-to-br ${config.gradient}`} rounded-2xl blur-2xl opacity-30 scale-95`} />
            <Image
              src={badgeUrl}
              alt="Badge with QR Code"
              width={288}
              height={config.badgeHeight}
              className="relative rounded-2xl"
              unoptimized
              key={`badge-${greyscale}`}
            />
          </div>
          <a
            href={badgeUrl}
            download={badgeFilename}
            className={`inline-flex items-center gap-2 px-6 py-3 ${
              greyscale
                ? "bg-gray-700 hover:bg-gray-800"
                : `bg-gradient-to-r ${config.gradient} hover:opacity-90`
            } text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
        </div>

        {/* Simple Badge */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 mb-4">Simple</p>
          <div className="relative mb-6">
            <div className={`absolute inset-0 ${greyscale ? "bg-gray-400" : `bg-gradient-to-br ${config.gradient}`} rounded-2xl blur-2xl opacity-30 scale-95`} />
            <Image
              src={simpleBadgeUrl}
              alt="Simple Badge"
              width={152}
              height={config.simpleBadgeHeight}
              className="relative rounded-2xl"
              unoptimized
              key={`simple-${greyscale}`}
            />
          </div>
          <a
            href={simpleBadgeUrl}
            download={simpleBadgeFilename}
            className={`inline-flex items-center gap-2 px-6 py-3 ${
              greyscale
                ? "bg-gray-700 hover:bg-gray-800"
                : `bg-gradient-to-r ${config.gradient} hover:opacity-90`
            } text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
