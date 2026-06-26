"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Email {
  id: string;
  email: string;
  isPrimary: boolean;
  visibility: "PUBLIC" | "PRIVATE";
  verified: "UNVERIFIED" | "PENDING" | "VERIFIED";
}

interface EmailListProps {
  initialEmails: Email[];
  loginEmail?: string;
}

export function EmailList({ initialEmails, loginEmail }: EmailListProps) {
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Verification state
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ id: string; success: boolean; message?: string; devUrl?: string } | null>(null);

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError("");

    try {
      const res = await fetch("/api/identity/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add email");
      }

      const email = await res.json();
      setEmails([...emails, email]);
      setNewEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const updateEmail = async (id: string, updates: Partial<Email>) => {
    try {
      const res = await fetch(`/api/identity/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update email");
      }

      const updated = await res.json();
      setEmails(emails.map((e) => (e.id === id ? updated : updates.isPrimary ? { ...e, isPrimary: false } : e)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const deleteEmail = async (id: string) => {
    if (!confirm("Are you sure you want to remove this email?")) return;

    try {
      const res = await fetch(`/api/identity/emails/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete email");
      }

      setEmails(emails.filter((e) => e.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const startEditing = (email: Email) => {
    setEditingId(email.id);
    setEditValue(email.email);
    setError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setError("Email address cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/identity/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update email");
      }

      const updated = await res.json();
      setEmails(emails.map((e) => (e.id === id ? updated : e)));
      setEditingId(null);
      setEditValue("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const sendVerificationEmail = async (emailId: string) => {
    setSendingId(emailId);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/verify/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }

      // Update email status to PENDING
      setEmails(emails.map((e) =>
        e.id === emailId ? { ...e, verified: "PENDING" as const } : e
      ));

      setVerifyResult({
        id: emailId,
        success: true,
        message: data.message,
        devUrl: data.devUrl, // Only in development
      });

      router.refresh();
    } catch (err) {
      setVerifyResult({
        id: emailId,
        success: false,
        message: err instanceof Error ? err.message : "Failed to send verification email",
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Email Form */}
      <form onSubmit={addEmail} className="flex gap-3">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Add new email address"
          required
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Email List */}
      {emails.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p>No email addresses added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <div key={email.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  {editingId === email.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-gray-900"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(email.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(email.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
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
                        {email.email}
                      </span>
                      {email.isPrimary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Primary
                        </span>
                      )}
                      {loginEmail && email.email.toLowerCase() === loginEmail.toLowerCase() && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          Login Email
                        </span>
                      )}
                      {email.verified === "VERIFIED" && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                      {email.verified === "PENDING" && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {editingId !== email.id && (
                  <>
                    {/* Edit - hidden for login email */}
                    {!(loginEmail && email.email.toLowerCase() === loginEmail.toLowerCase()) && (
                      <button
                        onClick={() => startEditing(email)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => updateEmail(email.id, {
                        visibility: email.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        email.visibility === "PUBLIC"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {email.visibility === "PUBLIC" ? "Public" : "Private"}
                    </button>

                    {/* Set as Primary */}
                    {!email.isPrimary && (
                      <button
                        onClick={() => updateEmail(email.id, { isPrimary: true })}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        Set Primary
                      </button>
                    )}

                    {/* Delete - hidden for login email */}
                    {!(loginEmail && email.email.toLowerCase() === loginEmail.toLowerCase()) && (
                      <button
                        onClick={() => deleteEmail(email.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Verification Section */}
              {email.verified !== "VERIFIED" && (
                <div className="border-t border-gray-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Verify Email Address
                  </h4>

                  {email.verified === "UNVERIFIED" && (
                    <>
                      <p className="text-sm text-blue-700 mb-3">
                        Send a verification link to this email address:
                      </p>
                      <button
                        onClick={() => sendVerificationEmail(email.id)}
                        disabled={sendingId === email.id}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {sendingId === email.id ? "Sending..." : "Send Verification Email"}
                      </button>
                    </>
                  )}

                  {email.verified === "PENDING" && (
                    <>
                      <p className="text-sm text-blue-700 mb-3">
                        We&apos;ve sent a verification link to your email. Click the link to verify.
                      </p>
                      <button
                        onClick={() => sendVerificationEmail(email.id)}
                        disabled={sendingId === email.id}
                        className="text-sm text-blue-700 hover:text-blue-900 underline"
                      >
                        {sendingId === email.id ? "Sending..." : "Resend verification email"}
                      </button>
                    </>
                  )}

                  {verifyResult?.id === email.id && (
                    <div className={`text-sm mt-2 ${verifyResult.success ? "text-emerald-600" : "text-red-600"}`}>
                      {verifyResult.message}
                      {verifyResult.devUrl && (
                        <a
                          href={verifyResult.devUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-2 font-mono text-xs bg-white px-3 py-2 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 break-all"
                        >
                          Dev: Click to verify (or copy link)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Public emails will be visible on your public identity page. Private emails are only visible to you.
      </p>
    </div>
  );
}
