"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RepresentationSelector } from "./RepresentationSelector";

type ContentType = "HUMAN" | "AI" | "WITH_AI";
type HashAlgorithm = "SHA256" | "SHA384" | "SHA512" | "SHA3_256" | "BLAKE3" | "";
type HashTarget = "FILE" | "URL_CONTENT" | "TEXT_CONTENT" | "";

interface FormData {
  title: string;
  description: string;
  contentType: ContentType;
  creatorName: string;
  originalUrl: string;
  thumbnailUrl: string;
  attribution: string;
  collaborators: string[];
  aiToolsUsed: string[];
  owner: string;
  // Hash fields
  contentHash: string;
  hashAlgorithm: HashAlgorithm;
  hashTarget: HashTarget;
  hashInputSize: number | null;
  hashInputFilename: string;
  // Git fields
  gitCommitHash: string;
  gitRepositoryUrl: string;
}

const HASH_ALGORITHMS: { value: HashAlgorithm; label: string; description: string }[] = [
  { value: "", label: "None", description: "No hash verification" },
  { value: "SHA256", label: "SHA-256", description: "Recommended" },
  { value: "SHA384", label: "SHA-384", description: "Higher security" },
  { value: "SHA512", label: "SHA-512", description: "Highest security" },
];

interface RegistrationFormProps {
  defaultCreatorName?: string;
}

interface HandleSuggestion {
  handle: string;
  displayName: string | null;
}

const contentTypeOptions = [
  {
    value: "HUMAN" as ContentType,
    label: "Made By HI",
    sublabel: "Human Intelligence",
    description: "100% human-created content",
    color: "cyan",
    gradient: "from-cyan-400 to-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-500",
    ring: "ring-cyan-500/20",
  },
  {
    value: "AI" as ContentType,
    label: "Made By AI",
    sublabel: "Artificial Intelligence",
    description: "Fully AI-generated content",
    color: "pink",
    gradient: "from-pink-400 to-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-500",
    ring: "ring-pink-500/20",
  },
  {
    value: "WITH_AI" as ContentType,
    label: "Made With AI",
    sublabel: "Human + AI Collaboration",
    description: "Human-AI collaborative work",
    color: "purple",
    gradient: "from-purple-400 to-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-500",
    ring: "ring-purple-500/20",
  },
];

export function RegistrationForm({ defaultCreatorName = "" }: RegistrationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    contentType: "HUMAN",
    creatorName: defaultCreatorName,
    originalUrl: "",
    thumbnailUrl: "",
    attribution: "",
    collaborators: [],
    aiToolsUsed: [],
    owner: "",
    // Hash fields
    contentHash: "",
    hashAlgorithm: "",
    hashTarget: "",
    hashInputSize: null,
    hashInputFilename: "",
    // Git fields
    gitCommitHash: "",
    gitRepositoryUrl: "",
  });

  // File upload and hashing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Legal representation selection state
  const [selectedRepresentationId, setSelectedRepresentationId] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const signatureDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [aiToolInput, setAiToolInput] = useState("");

  // Collaborator autocomplete state
  const [handleSuggestions, setHandleSuggestions] = useState<HandleSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const collaboratorInputRef = useRef<HTMLInputElement>(null);

  // Owner autocomplete state
  const [ownerSuggestions, setOwnerSuggestions] = useState<HandleSuggestion[]>([]);
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
  const [selectedOwnerIndex, setSelectedOwnerIndex] = useState(-1);
  const ownerSuggestionsRef = useRef<HTMLDivElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);

  // Fetch handle suggestions when collaborator input changes
  useEffect(() => {
    const searchHandles = async () => {
      if (collaboratorInput.trim().length < 2) {
        setHandleSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(`/api/identity/handles/search?q=${encodeURIComponent(collaboratorInput.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setHandleSuggestions(data.handles || []);
          setShowSuggestions(data.handles?.length > 0);
          setSelectedSuggestionIndex(-1);
        }
      } catch (err) {
        console.error("Failed to search handles:", err);
      }
    };

    const debounceTimer = setTimeout(searchHandles, 300);
    return () => clearTimeout(debounceTimer);
  }, [collaboratorInput]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        collaboratorInputRef.current &&
        !collaboratorInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        ownerSuggestionsRef.current &&
        !ownerSuggestionsRef.current.contains(event.target as Node) &&
        ownerInputRef.current &&
        !ownerInputRef.current.contains(event.target as Node)
      ) {
        setShowOwnerSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch handle suggestions for owner field
  useEffect(() => {
    const searchHandles = async () => {
      if (formData.owner.trim().length < 2) {
        setOwnerSuggestions([]);
        setShowOwnerSuggestions(false);
        return;
      }

      try {
        const response = await fetch(`/api/identity/handles/search?q=${encodeURIComponent(formData.owner.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setOwnerSuggestions(data.handles || []);
          setShowOwnerSuggestions(data.handles?.length > 0);
          setSelectedOwnerIndex(-1);
        }
      } catch (err) {
        console.error("Failed to search handles:", err);
      }
    };

    const debounceTimer = setTimeout(searchHandles, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.owner]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addCollaborator = (value?: string) => {
    const collaboratorValue = value || collaboratorInput.trim();
    if (collaboratorValue && !formData.collaborators.includes(collaboratorValue)) {
      setFormData((prev) => ({
        ...prev,
        collaborators: [...prev.collaborators, collaboratorValue],
      }));
      setCollaboratorInput("");
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const selectSuggestion = (suggestion: HandleSuggestion) => {
    addCollaborator(`@${suggestion.handle}`);
  };

  const handleCollaboratorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || handleSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        addCollaborator();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < handleSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(handleSuggestions[selectedSuggestionIndex]);
        } else {
          addCollaborator();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectOwnerSuggestion = (suggestion: HandleSuggestion) => {
    setFormData((prev) => ({ ...prev, owner: `@${suggestion.handle}` }));
    setShowOwnerSuggestions(false);
    setSelectedOwnerIndex(-1);
  };

  const handleOwnerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showOwnerSuggestions || ownerSuggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedOwnerIndex((prev) =>
          prev < ownerSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedOwnerIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedOwnerIndex >= 0) {
          selectOwnerSuggestion(ownerSuggestions[selectedOwnerIndex]);
        }
        break;
      case "Escape":
        setShowOwnerSuggestions(false);
        setSelectedOwnerIndex(-1);
        break;
    }
  };

  const removeCollaborator = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      collaborators: prev.collaborators.filter((_, i) => i !== index),
    }));
  };

  const addAiTool = () => {
    if (aiToolInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        aiToolsUsed: [...prev.aiToolsUsed, aiToolInput.trim()],
      }));
      setAiToolInput("");
    }
  };

  const removeAiTool = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      aiToolsUsed: prev.aiToolsUsed.filter((_, i) => i !== index),
    }));
  };

  // Compute hash from file using Web Crypto API
  const computeFileHash = async (file: File, algorithm: HashAlgorithm): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();

    // Map our algorithm names to Web Crypto API names
    const cryptoAlgorithm = {
      "SHA256": "SHA-256",
      "SHA384": "SHA-384",
      "SHA512": "SHA-512",
      "SHA3_256": "SHA-256", // Fallback, SHA-3 not supported in Web Crypto
      "BLAKE3": "SHA-256",   // Fallback, BLAKE3 not supported in Web Crypto
    }[algorithm] || "SHA-256";

    const hashBuffer = await crypto.subtle.digest(cryptoAlgorithm, arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // If an algorithm is selected, compute hash immediately
    if (formData.hashAlgorithm) {
      await computeAndSetHash(file, formData.hashAlgorithm);
    } else {
      // Just store file info without hash
      setFormData(prev => ({
        ...prev,
        hashTarget: "FILE",
        hashInputSize: file.size,
        hashInputFilename: file.name,
        contentHash: "",
      }));
    }
  };

  // Compute hash and update form
  const computeAndSetHash = async (file: File, algorithm: HashAlgorithm) => {
    if (!algorithm) return;

    setIsHashing(true);
    try {
      const hash = await computeFileHash(file, algorithm);
      setFormData(prev => ({
        ...prev,
        contentHash: hash,
        hashAlgorithm: algorithm,
        hashTarget: "FILE",
        hashInputSize: file.size,
        hashInputFilename: file.name,
      }));
    } catch (err) {
      console.error("Failed to compute hash:", err);
      setError("Failed to compute file hash");
    } finally {
      setIsHashing(false);
    }
  };

  // Handle algorithm change
  const handleAlgorithmChange = async (algorithm: HashAlgorithm) => {
    setFormData(prev => ({ ...prev, hashAlgorithm: algorithm }));

    if (selectedFile && algorithm) {
      await computeAndSetHash(selectedFile, algorithm);
    } else if (!algorithm) {
      // Clear hash if algorithm is removed
      setFormData(prev => ({
        ...prev,
        contentHash: "",
        hashTarget: "",
        hashInputSize: null,
        hashInputFilename: "",
      }));
    }
  };

  // Clear file selection
  const clearFileSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFormData(prev => ({
      ...prev,
      contentHash: "",
      hashTarget: "",
      hashInputSize: null,
      hashInputFilename: "",
    }));
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          contentType: formData.contentType,
          creatorName: formData.creatorName,
          originalUrl: formData.originalUrl,
          thumbnailUrl: formData.thumbnailUrl,
          attribution: formData.attribution,
          owner: formData.owner,
          collaborators: JSON.stringify(formData.collaborators),
          aiToolsUsed: JSON.stringify(formData.aiToolsUsed),
          // Include hash data only if hash was computed
          ...(formData.contentHash && {
            contentHash: formData.contentHash,
            hashAlgorithm: formData.hashAlgorithm,
            hashTarget: formData.hashTarget,
            hashInputSize: formData.hashInputSize,
            hashInputFilename: formData.hashInputFilename,
          }),
          // Include git data only if provided
          ...(formData.gitCommitHash && {
            gitCommitHash: formData.gitCommitHash,
          }),
          ...(formData.gitRepositoryUrl && {
            gitRepositoryUrl: formData.gitRepositoryUrl,
          }),
          // Legal representation data
          ...(selectedRepresentationId && {
            representationId: selectedRepresentationId,
            signatureName: signatureName || undefined,
          }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to register content");
      }

      const { id } = await response.json();
      router.push(`/success/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showAiTools = formData.contentType === "AI" || formData.contentType === "WITH_AI";
  const selectedOption = contentTypeOptions.find((o) => o.value === formData.contentType);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Content Type Selector - Featured at top */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Content Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contentTypeOptions.map((option) => (
            <label
              key={option.value}
              className={`relative flex flex-col items-center p-5 rounded-xl cursor-pointer transition-all border-2 ${
                formData.contentType === option.value
                  ? `${option.border} ${option.bg} ring-4 ${option.ring}`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="contentType"
                value={option.value}
                checked={formData.contentType === option.value}
                onChange={handleChange}
                className="sr-only"
              />
              {/* Mini badge preview */}
              <div
                className={`w-16 h-10 rounded-lg bg-gradient-to-br ${option.gradient} flex items-center justify-center mb-3 shadow-lg`}
              >
                <span className="text-white text-sm font-black">
                  {option.value === "HUMAN" ? "HI" : "AI"}
                </span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{option.label}</span>
              <span className="text-xs text-gray-500 mt-1">{option.description}</span>
              {formData.contentType === option.value && (
                <div className="absolute top-2 right-2">
                  <svg className={`w-5 h-5 text-${option.color}-500`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Basic Info Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Basic Information
        </h3>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
            placeholder="Enter your content title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
            placeholder="Describe your content..."
          />
        </div>

        {/* Creator Name */}
        <div>
          <label htmlFor="creatorName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Creator Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="creatorName"
            name="creatorName"
            required
            value={formData.creatorName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
            placeholder="Your name or organization"
          />
        </div>

        {/* Owner */}
        <div>
          <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1.5">
            Owner
          </label>
          <p className="text-xs text-gray-500 mb-2">
            The person or organization that owns this content. Can be a name or @handle.
          </p>
          <div className="relative">
            <input
              ref={ownerInputRef}
              type="text"
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              onKeyDown={handleOwnerKeyDown}
              onFocus={() => ownerSuggestions.length > 0 && setShowOwnerSuggestions(true)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
              placeholder="Name or @handle"
              autoComplete="off"
            />
            {/* Owner autocomplete dropdown */}
            {showOwnerSuggestions && ownerSuggestions.length > 0 && (
              <div
                ref={ownerSuggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
              >
                {ownerSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.handle}
                    type="button"
                    onClick={() => selectOwnerSuggestion(suggestion)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${
                      index === selectedOwnerIndex ? "bg-emerald-50" : ""
                    } ${index === 0 ? "rounded-t-xl" : ""} ${
                      index === ownerSuggestions.length - 1 ? "rounded-b-xl" : ""
                    }`}
                  >
                    <span className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {suggestion.displayName?.[0]?.toUpperCase() || suggestion.handle[0].toUpperCase()}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">@{suggestion.handle}</div>
                      {suggestion.displayName && (
                        <div className="text-sm text-gray-500">{suggestion.displayName}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Links Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Links & Media
          <span className="text-xs font-normal text-gray-500">(optional)</span>
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Original URL */}
          <div>
            <label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
              Original Content URL
            </label>
            <input
              type="url"
              id="originalUrl"
              name="originalUrl"
              value={formData.originalUrl}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
              placeholder="https://..."
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
              Thumbnail URL
            </label>
            <input
              type="url"
              id="thumbnailUrl"
              name="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Content Verification Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Content Verification
          <span className="text-xs font-normal text-gray-500">(optional)</span>
        </h3>
        <p className="text-sm text-gray-600">
          Upload a file to generate a cryptographic hash. This allows anyone to verify the content hasn&apos;t been modified since declaration.
        </p>

        {/* Hash Algorithm Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Hash Algorithm
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HASH_ALGORITHMS.map((algo) => (
              <label
                key={algo.value || "none"}
                className={`relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                  formData.hashAlgorithm === algo.value
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="hashAlgorithm"
                  value={algo.value}
                  checked={formData.hashAlgorithm === algo.value}
                  onChange={() => handleAlgorithmChange(algo.value)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900 text-sm">{algo.label}</span>
                <span className="text-xs text-gray-500">{algo.description}</span>
                {formData.hashAlgorithm === algo.value && (
                  <div className="absolute top-1 right-1">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* File Upload */}
        {formData.hashAlgorithm && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Content File
            </label>
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">Any file type supported</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{formData.hashInputFilename}</p>
                      <p className="text-xs text-gray-500">
                        {formData.hashInputSize ? formatFileSize(formData.hashInputSize) : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearFileSelection}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Hash Display */}
                {isHashing ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Computing hash...
                  </div>
                ) : formData.contentHash ? (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">{formData.hashAlgorithm} Hash</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(formData.contentHash)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Copy
                      </button>
                    </div>
                    <code className="text-xs text-gray-700 font-mono break-all">{formData.contentHash}</code>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        {formData.contentHash && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-emerald-800">Hash Recorded</p>
                <p className="text-xs text-emerald-700 mt-1">
                  This hash will be stored with your declaration. Anyone can verify the content integrity by re-computing the hash and comparing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Version Control Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Version Control
          <span className="text-xs font-normal text-gray-500">(optional)</span>
        </h3>
        <p className="text-sm text-gray-600">
          Link your content to a specific git commit to track its version history and source code.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Git Commit Hash */}
          <div>
            <label htmlFor="gitCommitHash" className="block text-sm font-medium text-gray-700 mb-1.5">
              Git Commit Hash
            </label>
            <input
              type="text"
              id="gitCommitHash"
              name="gitCommitHash"
              value={formData.gitCommitHash}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500 font-mono text-sm"
              placeholder="e.g., a1b2c3d or full SHA"
              pattern="[a-fA-F0-9]{7,40}"
              title="Enter a valid git commit hash (7-40 hex characters)"
            />
          </div>

          {/* Git Repository URL */}
          <div>
            <label htmlFor="gitRepositoryUrl" className="block text-sm font-medium text-gray-700 mb-1.5">
              Repository URL
            </label>
            <input
              type="url"
              id="gitRepositoryUrl"
              name="gitRepositoryUrl"
              value={formData.gitRepositoryUrl}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
              placeholder="https://github.com/user/repo"
            />
          </div>
        </div>

        {/* Info Box for Git */}
        {formData.gitCommitHash && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">Git Reference Added</p>
                <p className="text-xs text-blue-700 mt-1">
                  This commit hash will be linked to your declaration, allowing others to view the exact version of the source code.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Attribution Section */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Attribution & Credits
          <span className="text-xs font-normal text-gray-500">(optional)</span>
        </h3>

        {/* Attribution */}
        <div>
          <label htmlFor="attribution" className="block text-sm font-medium text-gray-700 mb-1.5">
            Detailed Attribution
          </label>
          <textarea
            id="attribution"
            name="attribution"
            rows={2}
            value={formData.attribution}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
            placeholder="Credit and attribution details..."
          />
        </div>

        {/* Collaborators */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Collaborators</label>
          <div className="relative">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  ref={collaboratorInputRef}
                  type="text"
                  value={collaboratorInput}
                  onChange={(e) => setCollaboratorInput(e.target.value)}
                  onKeyDown={handleCollaboratorKeyDown}
                  onFocus={() => handleSuggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Add collaborator name or @handle"
                  autoComplete="off"
                />
                {/* Autocomplete dropdown */}
                {showSuggestions && handleSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                  >
                    {handleSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.handle}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${
                          index === selectedSuggestionIndex ? "bg-emerald-50" : ""
                        } ${index === 0 ? "rounded-t-xl" : ""} ${
                          index === handleSuggestions.length - 1 ? "rounded-b-xl" : ""
                        }`}
                      >
                        <span className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {suggestion.displayName?.[0]?.toUpperCase() || suggestion.handle[0].toUpperCase()}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">@{suggestion.handle}</div>
                          {suggestion.displayName && (
                            <div className="text-sm text-gray-500">{suggestion.displayName}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => addCollaborator()}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium text-gray-700"
              >
                Add
              </button>
            </div>
          </div>
          {formData.collaborators.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.collaborators.map((collab, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700"
                >
                  {collab}
                  <button
                    type="button"
                    onClick={() => removeCollaborator(index)}
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Tools Used - Only shown for AI or WITH_AI */}
        {showAiTools && (
          <div className={`p-4 rounded-xl ${selectedOption?.bg} border ${selectedOption?.border}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Tools Used
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={aiToolInput}
                onChange={(e) => setAiToolInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAiTool())}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-white text-gray-900 placeholder-gray-500"
                placeholder="e.g., ChatGPT, Midjourney, DALL-E"
              />
              <button
                type="button"
                onClick={addAiTool}
                className="px-5 py-3 bg-white hover:bg-gray-50 rounded-xl transition-colors font-medium text-gray-700 border border-gray-200"
              >
                Add
              </button>
            </div>
            {formData.aiToolsUsed.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.aiToolsUsed.map((tool, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${selectedOption?.gradient} text-white rounded-full text-sm font-medium shadow-sm`}
                  >
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeAiTool(index)}
                      className="w-4 h-4 flex items-center justify-center text-white/70 hover:text-white rounded-full"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Legal Representation Section */}
      <RepresentationSelector
        selectedRepresentationId={selectedRepresentationId}
        onRepresentationSelect={setSelectedRepresentationId}
        signatureName={signatureName}
        onSignatureNameChange={setSignatureName}
        signatureDate={signatureDate}
        creatorName={formData.creatorName}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Registering...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Register Content
          </>
        )}
      </button>
    </form>
  );
}
