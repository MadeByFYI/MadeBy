"use client";

import { useState, useEffect } from "react";

interface Representation {
  id: string;
  code: string;
  assertionLevel: "STANDARD" | "PERJURY";
  name: string;
  shortDescription: string;
  assertionText: string;
  fullLegalText: string;
}

interface RepresentationSelectorProps {
  selectedRepresentationId: string | null;
  onRepresentationSelect: (representationId: string | null) => void;
  signatureName: string;
  onSignatureNameChange: (name: string) => void;
  signatureDate: string;
  creatorName: string;
}

export function RepresentationSelector({
  selectedRepresentationId,
  onRepresentationSelect,
  signatureName,
  onSignatureNameChange,
  signatureDate,
  creatorName,
}: RepresentationSelectorProps) {
  const [representations, setRepresentations] = useState<Representation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullText, setShowFullText] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepresentations = async () => {
      try {
        const response = await fetch("/api/representations");
        if (!response.ok) throw new Error("Failed to fetch representations");
        const data = await response.json();
        setRepresentations(data.representations);
      } catch (err) {
        console.error("Error fetching representations:", err);
        setError("Failed to load legal representations");
      } finally {
        setLoading(false);
      }
    };
    fetchRepresentations();
  }, []);

  const selectedRepresentation = representations.find((r) => r.id === selectedRepresentationId);
  const isPerjurySelected = selectedRepresentation?.assertionLevel === "PERJURY";

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded-xl"></div>
            <div className="h-48 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        {error}
      </div>
    );
  }

  const standardRep = representations.find((r) => r.code === "STANDARD");
  const perjuryRep = representations.find((r) => r.code === "PERJURY");

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Legal Representation
        <span className="text-xs font-normal text-gray-500">(optional)</span>
      </h3>
      <p className="text-sm text-gray-600">
        Associate a legally-binding assertion with your declaration. MadeBy.fyi records only that you created this badge and associated it with a legal representation — not that the declaration is true.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* No Representation Option */}
        <label
          className={`relative flex flex-col p-5 rounded-xl cursor-pointer transition-all border-2 ${
            selectedRepresentationId === null
              ? "border-gray-500 bg-gray-50 ring-4 ring-gray-500/20"
              : "border-gray-200 hover:border-gray-300 bg-white"
          }`}
        >
          <input
            type="radio"
            name="representation"
            checked={selectedRepresentationId === null}
            onChange={() => onRepresentationSelect(null)}
            className="sr-only"
          />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-gray-900">None</span>
              <p className="text-xs text-gray-500">Declaration only</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Register your content without a legal representation.
          </p>
          {selectedRepresentationId === null && (
            <div className="absolute top-2 right-2">
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </label>

        {/* Standard Representation Option */}
        {standardRep && (
          <label
            className={`relative flex flex-col p-5 rounded-xl cursor-pointer transition-all border-2 ${
              selectedRepresentationId === standardRep.id
                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/20"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="representation"
              checked={selectedRepresentationId === standardRep.id}
              onChange={() => onRepresentationSelect(standardRep.id)}
              className="sr-only"
            />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{standardRep.name}</span>
                <p className="text-xs text-gray-500">{standardRep.shortDescription}</p>
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-blue-200">
              <p className="text-sm text-gray-700 italic">&ldquo;{standardRep.assertionText}&rdquo;</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowFullText(showFullText === standardRep.id ? null : standardRep.id);
              }}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {showFullText === standardRep.id ? "Hide" : "View"} full legal text
            </button>
            {selectedRepresentationId === standardRep.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </label>
        )}
      </div>

      {/* Full text modal for Standard */}
      {showFullText === standardRep?.id && standardRep && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Full Legal Text</h4>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{standardRep.fullLegalText}</pre>
        </div>
      )}

      {/* Perjury Representation Option - Full Width */}
      {perjuryRep && (
        <div className="mt-4">
          <label
            className={`relative flex flex-col p-5 rounded-xl cursor-pointer transition-all border-2 ${
              selectedRepresentationId === perjuryRep.id
                ? "border-amber-500 bg-amber-50 ring-4 ring-amber-500/20"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="representation"
              checked={selectedRepresentationId === perjuryRep.id}
              onChange={() => onRepresentationSelect(perjuryRep.id)}
              className="sr-only"
            />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900">{perjuryRep.name}</span>
                <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded">Legal Weight</span>
                <p className="text-xs text-gray-500">{perjuryRep.shortDescription}</p>
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-amber-200">
              <p className="text-sm text-gray-700 italic whitespace-pre-line">&ldquo;{perjuryRep.assertionText}&rdquo;</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowFullText(showFullText === perjuryRep.id ? null : perjuryRep.id);
              }}
              className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              {showFullText === perjuryRep.id ? "Hide" : "View"} full legal text
            </button>
            {selectedRepresentationId === perjuryRep.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </label>

          {/* Full text modal for Perjury */}
          {showFullText === perjuryRep.id && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Full Legal Text</h4>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{perjuryRep.fullLegalText}</pre>
            </div>
          )}

          {/* Digital Signature Section - Only shown when Perjury is selected */}
          {isPerjurySelected && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Digital Signature Required
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                By typing your full legal name below, you acknowledge that this constitutes your legally binding electronic signature.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="signatureName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="signatureName"
                    value={signatureName}
                    onChange={(e) => onSignatureNameChange(e.target.value)}
                    placeholder={creatorName || "Type your full legal name"}
                    required={isPerjurySelected}
                    className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-white text-gray-900 placeholder-gray-400 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Signature
                  </label>
                  <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700">
                    {signatureDate}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> A false declaration under penalty of perjury is a federal crime under 18 U.S.C. § 1621.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-600">
          <strong>Disclaimer:</strong> MadeBy.fyi does NOT assert that any declaration is true. We only record that users created badges and associated them with legal representations.
        </p>
      </div>
    </div>
  );
}
