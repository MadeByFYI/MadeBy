"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Domain {
  id: string;
  domain: string;
  visibility: "PUBLIC" | "PRIVATE";
  verified: "UNVERIFIED" | "PENDING" | "VERIFIED";
  verificationToken: string | null;
}

interface DomainListProps {
  initialDomains: Domain[];
}

export function DomainList({ initialDomains }: DomainListProps) {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ id: string; success: boolean; message?: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError("");

    try {
      const res = await fetch("/api/identity/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add domain");
      }

      const domain = await res.json();
      setDomains([domain, ...domains]);
      setNewDomain("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const updateDomain = async (id: string, updates: Partial<Domain>) => {
    try {
      const res = await fetch(`/api/identity/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update domain");
      }

      const updated = await res.json();
      setDomains(domains.map((d) => (d.id === id ? updated : d)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const deleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to remove this domain?")) return;

    try {
      const res = await fetch(`/api/identity/domains/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete domain");
      }

      setDomains(domains.filter((d) => d.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const verifyDomain = async (id: string) => {
    setVerifyingId(id);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/verify/domain/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: id }),
      });

      const data = await res.json();

      if (data.verified) {
        setDomains(domains.map((d) =>
          d.id === id ? { ...d, verified: "VERIFIED" as const } : d
        ));
        setVerifyResult({ id, success: true });
        router.refresh();
      } else {
        setVerifyResult({ id, success: false, message: data.message || "Verification failed" });
      }
    } catch (err) {
      setVerifyResult({ id, success: false, message: "Verification check failed" });
    } finally {
      setVerifyingId(null);
    }
  };

  const startEditing = (domain: Domain) => {
    setEditingId(domain.id);
    setEditValue(domain.domain);
    setError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setError("Domain cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/identity/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: editValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update domain");
      }

      const updated = await res.json();
      setDomains(domains.map((d) => (d.id === id ? updated : d)));
      setEditingId(null);
      setEditValue("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Domain Form */}
      <form onSubmit={addDomain} className="flex gap-3">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          required
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Domain List */}
      {domains.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <p>No domains added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div key={domain.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  {editingId === domain.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all text-gray-900"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(domain.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(domain.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-medium truncate">
                        {domain.domain}
                      </span>
                      {domain.verified === "VERIFIED" && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {editingId !== domain.id && (
                  <>
                    {/* Edit */}
                    <button
                      onClick={() => startEditing(domain)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => updateDomain(domain.id, {
                        visibility: domain.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        domain.visibility === "PUBLIC"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {domain.visibility === "PUBLIC" ? "Public" : "Private"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteDomain(domain.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Verification Section */}
              {domain.verified !== "VERIFIED" && domain.verificationToken && (
                <div className="border-t border-gray-200 bg-amber-50 p-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    Verify Domain Ownership
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    Add this TXT record to your DNS settings:
                  </p>
                  <div className="bg-white rounded-lg p-3 mb-3 border border-amber-200 font-mono text-sm">
                    <p className="text-xs text-gray-500 mb-1">Host/Name:</p>
                    <p className="text-gray-800 mb-2">_madeby-verify</p>
                    <p className="text-xs text-gray-500 mb-1">Value:</p>
                    <p className="text-gray-800 break-all">
                      madeby-verify={domain.verificationToken}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => verifyDomain(domain.id)}
                      disabled={verifyingId === domain.id}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      {verifyingId === domain.id ? "Checking..." : "Verify Now"}
                    </button>
                    <Link
                      href="/settings/identity/domains/faq"
                      className="text-sm text-amber-700 hover:text-amber-900 underline"
                    >
                      Need help?
                    </Link>
                  </div>
                  {verifyResult?.id === domain.id && !verifyResult.success && (
                    <p className="text-sm text-red-600 mt-2">
                      {verifyResult.message}
                    </p>
                  )}
                  {verifyResult?.id === domain.id && verifyResult.success && (
                    <p className="text-sm text-emerald-600 mt-2">
                      Domain verified successfully!
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-500">
          Public domains will be visible on your public identity page. Private domains are only visible to you.
          Verify your domains by adding a DNS TXT record. DNS changes may take up to 48 hours to propagate.
        </p>
        <Link
          href="/settings/identity/domains/faq"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          DNS Help
        </Link>
      </div>
    </div>
  );
}
