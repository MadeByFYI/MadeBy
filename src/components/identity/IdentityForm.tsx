"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface IdentityFormProps {
  initialData?: {
    handle?: string | null;
    identityType?: "INDIVIDUAL" | "CORPORATE";
    displayName?: string | null;
    bio?: string | null;
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

  const [formData, setFormData] = useState({
    handle: initialData?.handle || "",
    identityType: initialData?.identityType || "INDIVIDUAL",
    displayName: initialData?.displayName || "",
    bio: initialData?.bio || "",
  });

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
      const res = await fetch("/api/identity", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
        <div className="grid grid-cols-2 gap-4">
          {(["INDIVIDUAL", "CORPORATE"] as const).map((type) => (
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
                    identityType: e.target.value as "INDIVIDUAL" | "CORPORATE",
                  }))
                }
                className="sr-only"
              />
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  type === "INDIVIDUAL" ? "bg-emerald-100" : "bg-purple-100"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    type === "INDIVIDUAL"
                      ? "text-emerald-600"
                      : "text-purple-600"
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
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  )}
                </svg>
              </div>
              <span className="font-medium text-gray-900">
                {type === "INDIVIDUAL" ? "Individual" : "Organization"}
              </span>
            </label>
          ))}
        </div>
      </div>

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
