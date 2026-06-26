"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Phone {
  id: string;
  phone: string;
  isPrimary: boolean;
  visibility: "PUBLIC" | "PRIVATE";
  verified: "UNVERIFIED" | "PENDING" | "VERIFIED";
}

interface PhoneListProps {
  initialPhones: Phone[];
}

export function PhoneList({ initialPhones }: PhoneListProps) {
  const router = useRouter();
  const [phones, setPhones] = useState<Phone[]>(initialPhones);
  const [newPhone, setNewPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [sendingCodeId, setSendingCodeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ id: string; success: boolean; message?: string; devCode?: string } | null>(null);

  const addPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError("");

    try {
      const res = await fetch("/api/identity/phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add phone");
      }

      const phone = await res.json();
      setPhones([...phones, phone]);
      setNewPhone("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const updatePhone = async (id: string, updates: Partial<Phone>) => {
    try {
      const res = await fetch(`/api/identity/phones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update phone");
      }

      const updated = await res.json();
      setPhones(phones.map((p) => (p.id === id ? updated : updates.isPrimary ? { ...p, isPrimary: false } : p)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const deletePhone = async (id: string) => {
    if (!confirm("Are you sure you want to remove this phone?")) return;

    try {
      const res = await fetch(`/api/identity/phones/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete phone");
      }

      setPhones(phones.filter((p) => p.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const startEditing = (phone: Phone) => {
    setEditingId(phone.id);
    setEditValue(phone.phone);
    setError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setError("Phone number cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/identity/phones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update phone");
      }

      const updated = await res.json();
      setPhones(phones.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
      setEditValue("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const sendVerificationCode = async (phoneId: string, method: "sms" | "call") => {
    setSendingCodeId(phoneId);
    setVerifyResult(null);
    setVerificationCode("");

    try {
      const res = await fetch("/api/verify/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneId, method }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      // Update phone status to PENDING
      setPhones(phones.map((p) =>
        p.id === phoneId ? { ...p, verified: "PENDING" as const } : p
      ));

      setVerifyingId(phoneId);
      setVerifyResult({
        id: phoneId,
        success: true,
        message: data.message,
        devCode: data.devCode, // Only in development
      });
    } catch (err) {
      setVerifyResult({
        id: phoneId,
        success: false,
        message: err instanceof Error ? err.message : "Failed to send code",
      });
    } finally {
      setSendingCodeId(null);
    }
  };

  const confirmVerification = async (phoneId: string) => {
    if (!verificationCode.trim()) {
      setVerifyResult({ id: phoneId, success: false, message: "Please enter the verification code" });
      return;
    }

    setVerifyingId(phoneId);

    try {
      const res = await fetch("/api/verify/phone/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneId, code: verificationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Update phone to verified
      setPhones(phones.map((p) =>
        p.id === phoneId ? { ...p, verified: "VERIFIED" as const } : p
      ));

      setVerifyResult({ id: phoneId, success: true, message: "Phone verified successfully!" });
      setVerificationCode("");
      router.refresh();
    } catch (err) {
      setVerifyResult({
        id: phoneId,
        success: false,
        message: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Phone Form */}
      <form onSubmit={addPhone} className="flex gap-3">
        <input
          type="tel"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          required
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {isAdding ? "Adding..." : "Add"}
        </button>
      </form>

      <p className="text-sm text-gray-500">
        Use international format with country code (e.g., +1 for US/Canada)
      </p>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Phone List */}
      {phones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <p>No phone numbers added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {phones.map((phone) => (
            <div key={phone.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  {editingId === phone.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all text-gray-900"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(phone.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => saveEdit(phone.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
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
                        {phone.phone}
                      </span>
                      {phone.isPrimary && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Primary
                        </span>
                      )}
                      {phone.verified === "VERIFIED" && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                      {phone.verified === "PENDING" && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {editingId !== phone.id && (
                  <>
                    {/* Edit */}
                    <button
                      onClick={() => startEditing(phone)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => updatePhone(phone.id, {
                        visibility: phone.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        phone.visibility === "PUBLIC"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {phone.visibility === "PUBLIC" ? "Public" : "Private"}
                    </button>

                    {/* Set as Primary */}
                    {!phone.isPrimary && (
                      <button
                        onClick={() => updatePhone(phone.id, { isPrimary: true })}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        Set Primary
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => deletePhone(phone.id)}
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
              {phone.verified !== "VERIFIED" && (
                <div className="border-t border-gray-200 bg-amber-50 p-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    Verify Phone Number
                  </h4>

                  {phone.verified === "UNVERIFIED" && (
                    <>
                      <p className="text-sm text-amber-700 mb-3">
                        Send a verification code to this number:
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendVerificationCode(phone.id, "sms")}
                          disabled={sendingCodeId === phone.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          {sendingCodeId === phone.id ? "Sending..." : "Send SMS"}
                        </button>
                        <button
                          onClick={() => sendVerificationCode(phone.id, "call")}
                          disabled={sendingCodeId === phone.id}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {sendingCodeId === phone.id ? "Calling..." : "Call Me"}
                        </button>
                      </div>
                    </>
                  )}

                  {phone.verified === "PENDING" && (
                    <>
                      <p className="text-sm text-amber-700 mb-3">
                        Enter the 6-digit code you received:
                      </p>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          maxLength={6}
                          className="w-32 px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-gray-900 text-center font-mono text-lg tracking-widest"
                        />
                        <button
                          onClick={() => confirmVerification(phone.id)}
                          disabled={verifyingId === phone.id || verificationCode.length !== 6}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          {verifyingId === phone.id ? "Verifying..." : "Verify"}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setPhones(phones.map((p) =>
                            p.id === phone.id ? { ...p, verified: "UNVERIFIED" as const } : p
                          ));
                          setVerificationCode("");
                          setVerifyResult(null);
                        }}
                        className="text-sm text-amber-700 hover:text-amber-900 underline"
                      >
                        Send a new code
                      </button>
                    </>
                  )}

                  {verifyResult?.id === phone.id && (
                    <p className={`text-sm mt-2 ${verifyResult.success ? "text-emerald-600" : "text-red-600"}`}>
                      {verifyResult.message}
                      {verifyResult.devCode && (
                        <span className="block mt-1 font-mono bg-white px-2 py-1 rounded border border-amber-200">
                          Dev code: {verifyResult.devCode}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Public phone numbers will be visible on your public identity page. Private phone numbers are only visible to you.
      </p>
    </div>
  );
}
