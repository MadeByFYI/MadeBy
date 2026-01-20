"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// AI Provider options
const AI_PROVIDERS = [
  { value: "ANTHROPIC", label: "Anthropic", type: "text", models: ["CLAUDE_OPUS", "CLAUDE_SONNET", "CLAUDE_HAIKU"] },
  { value: "OPENAI", label: "OpenAI", type: "text+image", models: ["GPT_4", "GPT_4_TURBO", "GPT_4O", "O1", "O1_MINI", "DALL_E_2", "DALL_E_3"] },
  { value: "GOOGLE", label: "Google", type: "text+image", models: ["GEMINI_PRO", "GEMINI_ULTRA", "IMAGEN", "IMAGEN_2"] },
  { value: "META", label: "Meta", type: "text", models: ["LLAMA_3"] },
  { value: "MISTRAL", label: "Mistral", type: "text", models: ["OTHER"] },
  { value: "COHERE", label: "Cohere", type: "text", models: ["OTHER"] },
  { value: "STABILITY", label: "Stability AI", type: "image", models: ["STABLE_DIFFUSION", "STABLE_DIFFUSION_XL", "STABLE_DIFFUSION_3"] },
  { value: "MIDJOURNEY", label: "Midjourney", type: "image", models: ["MIDJOURNEY_V5", "MIDJOURNEY_V6"] },
  { value: "ADOBE", label: "Adobe", type: "image", models: ["FIREFLY"] },
  { value: "OTHER", label: "Other", type: "any", models: ["OTHER"] },
] as const;

// Model display names
const MODEL_LABELS: Record<string, string> = {
  // Anthropic
  CLAUDE_OPUS: "Claude Opus",
  CLAUDE_SONNET: "Claude Sonnet",
  CLAUDE_HAIKU: "Claude Haiku",
  // OpenAI - Text
  GPT_4: "GPT-4",
  GPT_4_TURBO: "GPT-4 Turbo",
  GPT_4O: "GPT-4o",
  O1: "o1",
  O1_MINI: "o1-mini",
  // OpenAI - Image
  DALL_E_2: "DALL-E 2",
  DALL_E_3: "DALL-E 3",
  // Google
  GEMINI_PRO: "Gemini Pro",
  GEMINI_ULTRA: "Gemini Ultra",
  IMAGEN: "Imagen",
  IMAGEN_2: "Imagen 2",
  // Meta
  LLAMA_3: "Llama 3",
  // Stability AI
  STABLE_DIFFUSION: "Stable Diffusion",
  STABLE_DIFFUSION_XL: "Stable Diffusion XL",
  STABLE_DIFFUSION_3: "Stable Diffusion 3",
  // Midjourney
  MIDJOURNEY_V5: "Midjourney v5",
  MIDJOURNEY_V6: "Midjourney v6",
  // Adobe
  FIREFLY: "Adobe Firefly",
  // Generic
  OTHER: "Other",
};

type AIProvider = typeof AI_PROVIDERS[number]["value"];
type AIModel = string;

interface ProviderCredential {
  id: string;
  provider: string;
  credentialType: string;
  isActive: boolean;
  lastUsedAt?: string | null;
}

interface IdentityFormProps {
  initialData?: {
    handle?: string | null;
    identityType?: "INDIVIDUAL" | "CORPORATE" | "AI";
    displayName?: string | null;
    bio?: string | null;
    aiConfig?: {
      provider?: AIProvider;
      model?: AIModel;
      modelVersion?: string | null;
      providerVerified?: string;
      providerVerifiedAt?: string | null;
    } | null;
    providerCredentials?: ProviderCredential[];
  };
  mode: "create" | "edit";
}

export function IdentityForm({ initialData, mode }: IdentityFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid" | "reserved"
  >("idle");
  const [handleMessage, setHandleMessage] = useState("");

  // Provider verification state
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [providerCredentials, setProviderCredentials] = useState<ProviderCredential[]>(
    initialData?.providerCredentials || []
  );

  const [formData, setFormData] = useState({
    handle: initialData?.handle || "",
    identityType: initialData?.identityType || "INDIVIDUAL",
    displayName: initialData?.displayName || "",
    bio: initialData?.bio || "",
    // AI-specific fields
    aiProvider: initialData?.aiConfig?.provider || "ANTHROPIC",
    aiModel: initialData?.aiConfig?.model || "CLAUDE_OPUS",
    aiModelVersion: initialData?.aiConfig?.modelVersion || "",
  });

  // Get available models for selected provider
  const availableModels = AI_PROVIDERS.find(p => p.value === formData.aiProvider)?.models || ["OTHER"];

  // Reset model when provider changes
  useEffect(() => {
    if (formData.identityType === "AI") {
      const providerModels = AI_PROVIDERS.find(p => p.value === formData.aiProvider)?.models || ["OTHER"];
      if (!(providerModels as readonly string[]).includes(formData.aiModel)) {
        setFormData(prev => ({ ...prev, aiModel: providerModels[0] }));
      }
    }
  }, [formData.aiProvider, formData.identityType, formData.aiModel]);

  // Debounced handle check
  useEffect(() => {
    if (!formData.handle || formData.handle.length < 3) {
      setHandleStatus("idle");
      setHandleMessage("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setHandleStatus("checking");
      try {
        const res = await fetch("/api/identity/handle/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: formData.handle }),
        });
        const data = await res.json();

        if (data.available) {
          setHandleStatus("available");
          setHandleMessage("");
        } else {
          setHandleStatus(data.reason || "taken");
          setHandleMessage(data.message || "Handle unavailable");
        }
      } catch {
        setHandleStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.handle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validate handle is available
    if (handleStatus === "taken" || handleStatus === "reserved" || handleStatus === "invalid") {
      setError("Please choose a valid, available handle");
      setIsSubmitting(false);
      return;
    }

    try {
      // Build request body, including AI config if AI identity type
      const requestBody = {
        handle: formData.handle,
        identityType: formData.identityType,
        displayName: formData.displayName,
        bio: formData.bio,
        ...(formData.identityType === "AI" && {
          aiConfig: {
            provider: formData.aiProvider,
            model: formData.aiModel,
            modelVersion: formData.aiModelVersion || null,
          },
        }),
      };

      const res = await fetch("/api/identity", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save identity");
      }

      const identity = await res.json();
      if (identity.handle) {
        router.push(`/${identity.handle}`);
      } else {
        router.push("/settings/identity");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current provider's credential if any
  const currentProviderCredential = providerCredentials.find(
    (c) => c.provider === formData.aiProvider && c.isActive
  );

  // Handle provider verification
  const handleProviderVerification = async () => {
    if (!apiKey.trim()) {
      setVerificationError("Please enter an API key");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");

    try {
      const res = await fetch("/api/identity/provider-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formData.aiProvider,
          apiKey: apiKey,
          credentialType: "ADMIN_API_KEY",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify provider");
      }

      const credential = await res.json();
      setProviderCredentials((prev) => [
        ...prev.filter((c) => c.provider !== formData.aiProvider),
        credential,
      ]);
      setApiKey("");
      setShowApiKeyInput(false);
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle removing provider credential
  const handleRemoveCredential = async (credentialId: string) => {
    try {
      const res = await fetch(`/api/identity/provider-credential/${credentialId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove credential");
      }

      setProviderCredentials((prev) => prev.filter((c) => c.id !== credentialId));
    } catch (err) {
      console.error("Error removing credential:", err);
    }
  };

  const handleStatusIcon = () => {
    switch (handleStatus) {
      case "checking":
        return (
          <svg
            className="w-5 h-5 animate-spin text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        );
      case "available":
        return (
          <svg
            className="w-5 h-5 text-emerald-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "taken":
      case "reserved":
      case "invalid":
        return (
          <svg
            className="w-5 h-5 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Identity Type
        </label>
        <div className="grid grid-cols-3 gap-4">
          {(["INDIVIDUAL", "CORPORATE", "AI"] as const).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                formData.identityType === type
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="identityType"
                value={type}
                checked={formData.identityType === type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    identityType: e.target.value as "INDIVIDUAL" | "CORPORATE" | "AI",
                  }))
                }
                className="sr-only"
              />
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  type === "INDIVIDUAL"
                    ? "bg-emerald-100"
                    : type === "CORPORATE"
                    ? "bg-purple-100"
                    : "bg-blue-100"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    type === "INDIVIDUAL"
                      ? "text-emerald-600"
                      : type === "CORPORATE"
                      ? "text-purple-600"
                      : "text-blue-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {type === "INDIVIDUAL" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  ) : type === "CORPORATE" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  )}
                </svg>
              </div>
              <span className="font-medium text-gray-900">
                {type === "INDIVIDUAL" ? "Individual" : type === "CORPORATE" ? "Organization" : "AI"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* AI-specific fields */}
      {formData.identityType === "AI" && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            AI Configuration
          </h3>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.aiProvider}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, aiProvider: e.target.value as AIProvider }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white text-gray-900"
            >
              {AI_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Model <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.aiModel}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, aiModel: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white text-gray-900"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {MODEL_LABELS[model] || model}
                </option>
              ))}
            </select>
          </div>

          {/* Model Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Model Version
            </label>
            <input
              type="text"
              value={formData.aiModelVersion}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, aiModelVersion: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white text-gray-900"
              placeholder="e.g., claude-opus-4-5-20251101"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Specific version identifier from the provider
            </p>
          </div>

          {/* Provider Verification */}
          <div className="pt-4 border-t border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Provider Verification
            </h4>

            {currentProviderCredential ? (
              // Show connected state
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    {AI_PROVIDERS.find(p => p.value === formData.aiProvider)?.label} API Connected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCredential(currentProviderCredential.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Disconnect
                </button>
              </div>
            ) : showApiKeyInput ? (
              // Show API key input form
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {AI_PROVIDERS.find(p => p.value === formData.aiProvider)?.label} Admin API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={formData.aiProvider === "ANTHROPIC" ? "sk-ant-admin-..." : "API key"}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.aiProvider === "ANTHROPIC"
                      ? "Enter your Anthropic Admin API key for usage verification"
                      : "Enter your provider's API key for verification"}
                  </p>
                </div>
                {verificationError && (
                  <p className="text-xs text-red-600">{verificationError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleProviderVerification}
                    disabled={isVerifying}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isVerifying ? "Verifying..." : "Connect"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowApiKeyInput(false);
                      setApiKey("");
                      setVerificationError("");
                    }}
                    className="py-2 px-4 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Show connect button
              <div className="space-y-3">
                <p className="text-xs text-gray-600">
                  Connect your {AI_PROVIDERS.find(p => p.value === formData.aiProvider)?.label} account to verify API usage and strengthen identity attestations.
                </p>
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(true)}
                  className="w-full py-2 px-4 bg-white border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect {AI_PROVIDERS.find(p => p.value === formData.aiProvider)?.label} Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Handle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Handle <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            @
          </span>
          <input
            type="text"
            value={formData.handle}
            onChange={(e) => {
              const value = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "");
              setFormData((prev) => ({ ...prev, handle: value }));
            }}
            required
            minLength={3}
            maxLength={30}
            className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
            placeholder="your-handle"
          />
          {handleStatus !== "idle" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {handleStatusIcon()}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Your public URL: /{formData.handle || "your-handle"}
        </p>
        {handleMessage && (
          <p className="text-sm text-red-600 mt-1">{handleMessage}</p>
        )}
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Display Name
        </label>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, displayName: e.target.value }))
          }
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
          placeholder="Your name or organization name"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, bio: e.target.value }))
          }
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none bg-gray-50/50 hover:bg-white text-gray-900"
          placeholder="Tell visitors about yourself..."
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          handleStatus === "taken" ||
          handleStatus === "reserved" ||
          handleStatus === "invalid" ||
          handleStatus === "checking"
        }
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
      >
        {isSubmitting
          ? "Saving..."
          : mode === "create"
          ? "Create Identity"
          : "Save Changes"}
      </button>
    </form>
  );
}
