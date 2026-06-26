"use client";

import { useState, useEffect } from "react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResponse {
  id: string;
  key: string;
  keyPrefix: string;
  name: string;
  expiresAt: string | null;
  message: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // New key form state
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState<"never" | "30" | "60" | "90">("never");
  const [isCreating, setIsCreating] = useState(false);

  // Newly created key display
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewKeyResponse | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // Delete confirmation
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch keys on mount
  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data = await res.json();
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays: newKeyExpiry === "never" ? null : parseInt(newKeyExpiry),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create key");
      }

      const data: NewKeyResponse = await res.json();
      setNewlyCreatedKey(data);
      setShowNewKeyForm(false);
      setNewKeyName("");
      setNewKeyExpiry("never");

      // Refresh key list
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete key");
      }

      setKeys(keys.filter((k) => k.id !== keyId));
      setDeletingKeyId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete key");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyKeyToClipboard = () => {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey.key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never used";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-emerald-900 mb-1">API Key Created</h4>
              <p className="text-sm text-emerald-700 mb-3">
                Store this key securely. You won&apos;t be able to see it again.
              </p>
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-emerald-200">
                <code className="flex-1 text-sm font-mono text-gray-900 break-all">
                  {newlyCreatedKey.key}
                </code>
                <button
                  onClick={copyKeyToClipboard}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  {keyCopied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="mt-3 text-sm text-emerald-700 hover:text-emerald-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Key Button / Form */}
      {!showNewKeyForm ? (
        <button
          onClick={() => setShowNewKeyForm(true)}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New API Key
        </button>
      ) : (
        <form onSubmit={handleCreateKey} className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Create New API Key</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Key Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production App, CI/CD Pipeline"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900 placeholder-gray-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">A descriptive name to identify this key</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Expiration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "never", label: "Never" },
                  { value: "30", label: "30 days" },
                  { value: "60", label: "60 days" },
                  { value: "90", label: "90 days" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all border-2 ${
                      newKeyExpiry === option.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="expiry"
                      value={option.value}
                      checked={newKeyExpiry === option.value}
                      onChange={(e) => setNewKeyExpiry(e.target.value as typeof newKeyExpiry)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={isCreating || !newKeyName.trim()}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create API Key"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewKeyForm(false);
                setNewKeyName("");
                setNewKeyExpiry("never");
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Keys List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Your API Keys</h3>
        </div>

        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-gray-600">No API keys yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first API key to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map((key) => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{key.name}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <code className="bg-gray-100 px-2 py-0.5 rounded">{key.keyPrefix}...</code>
                      <span>Created {formatDate(key.createdAt)}</span>
                      {key.expiresAt && (
                        <span className="text-amber-600">Expires {formatDate(key.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(key.lastUsedAt)}
                  </span>

                  {deletingKeyId === key.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600">Delete?</span>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {isDeleting ? "..." : "Yes"}
                      </button>
                      <button
                        onClick={() => setDeletingKeyId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingKeyId(key.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete key"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
