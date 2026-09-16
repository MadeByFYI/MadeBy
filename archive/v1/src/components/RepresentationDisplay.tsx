"use client";

import { useState } from "react";

interface RepresentationAcceptance {
  id: string;
  acceptedByName: string;
  acceptedAt: string;
  legalTextSnapshot: string;
  signatureName: string | null;
  signatureDate: string | null;
  representation: {
    code: string;
    assertionLevel: "STANDARD" | "PERJURY";
    name: string;
    shortDescription: string;
    assertionText: string;
  };
}

interface RepresentationDisplayProps {
  representationAcceptance: RepresentationAcceptance;
}

export function RepresentationDisplay({ representationAcceptance }: RepresentationDisplayProps) {
  const [showFullText, setShowFullText] = useState(false);

  const { representation } = representationAcceptance;
  const isPerjury = representation.assertionLevel === "PERJURY";

  const borderColor = isPerjury ? "border-amber-200" : "border-blue-200";
  const bgColor = isPerjury ? "bg-amber-50" : "bg-blue-50";
  const headerGradient = isPerjury
    ? "from-amber-500 to-amber-600"
    : "from-blue-500 to-blue-600";
  const iconBg = isPerjury ? "bg-amber-100" : "bg-blue-100";
  const iconColor = isPerjury ? "text-amber-600" : "text-blue-600";
  const badgeColor = isPerjury
    ? "bg-amber-200 text-amber-800"
    : "bg-blue-200 text-blue-800";

  return (
    <div className={`bg-white rounded-2xl shadow-lg border ${borderColor} overflow-hidden mb-8`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerGradient} px-6 py-4`}>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Legal Representation
        </h2>
      </div>

      <div className="p-6">
        {/* Representation Type */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
            {isPerjury ? (
              <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{representation.name}</h3>
              {isPerjury && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeColor}`}>
                  Legal Weight
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{representation.shortDescription}</p>
          </div>
        </div>

        {/* Assertion Text */}
        <div className={`${bgColor} rounded-xl p-4 border ${borderColor} mb-4`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assertion</p>
          <p className="text-gray-700 italic whitespace-pre-line">&ldquo;{representation.assertionText}&rdquo;</p>
        </div>

        {/* Signature Section - Only for Perjury */}
        {isPerjury && representationAcceptance.signatureName && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Digital Signature</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Signed by</p>
                <p className="font-semibold text-gray-900">{representationAcceptance.signatureName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date signed</p>
                <p className="font-semibold text-gray-900">
                  {representationAcceptance.signatureDate
                    ? new Date(representationAcceptance.signatureDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acceptance Info */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Representation Acceptance</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Accepted by</p>
              <p className="text-gray-900 font-medium">{representationAcceptance.acceptedByName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Accepted on</p>
              <p className="text-gray-900 font-medium">
                {new Date(representationAcceptance.acceptedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* View Full Legal Text */}
        <button
          type="button"
          onClick={() => setShowFullText(!showFullText)}
          className={`text-sm font-medium ${isPerjury ? "text-amber-600 hover:text-amber-700" : "text-blue-600 hover:text-blue-700"} flex items-center gap-1`}
        >
          <svg className={`w-4 h-4 transition-transform ${showFullText ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showFullText ? "Hide" : "View"} full legal text (as accepted)
        </button>

        {showFullText && (
          <div className={`mt-4 ${bgColor} rounded-xl p-4 border ${borderColor}`}>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {representationAcceptance.legalTextSnapshot}
            </pre>
          </div>
        )}
      </div>

      {/* Disclaimer Footer */}
      <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-600">
            <strong>Disclaimer:</strong> MadeBy.fyi does NOT assert that this declaration is true. We only record that the user created this badge and associated it with this legal representation.
          </p>
        </div>
      </div>
    </div>
  );
}
