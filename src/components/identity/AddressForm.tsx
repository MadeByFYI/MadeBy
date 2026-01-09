"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Address {
  id: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  visibility: "PUBLIC" | "PRIVATE";
  verified: "UNVERIFIED" | "PENDING" | "VERIFIED";
}

interface AddressFormProps {
  initialAddress: Address | null;
}

export function AddressForm({ initialAddress }: AddressFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [address, setAddress] = useState<Address | null>(initialAddress);

  const [formData, setFormData] = useState({
    street1: initialAddress?.street1 || "",
    street2: initialAddress?.street2 || "",
    city: initialAddress?.city || "",
    state: initialAddress?.state || "",
    postalCode: initialAddress?.postalCode || "",
    country: initialAddress?.country || "",
    visibility: initialAddress?.visibility || "PRIVATE",
  });

  // Verification state
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message?: string; devCode?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/identity/address", {
        method: address ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save address");
      }

      const updatedAddress = await res.json();
      setAddress(updatedAddress);
      setSuccess("Address saved successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your address?")) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/identity/address", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete address");
      }

      setAddress(null);
      setFormData({
        street1: "",
        street2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        visibility: "PRIVATE",
      });
      setSuccess("Address deleted");
      setVerifyResult(null);
      setVerificationCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendVerificationRequest = async () => {
    setSendingVerification(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/verify/address/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification");
      }

      // Update address status to PENDING
      if (address) {
        setAddress({ ...address, verified: "PENDING" });
      }

      setVerifyResult({
        success: true,
        message: data.message,
        devCode: data.devCode, // Only in development
      });

      router.refresh();
    } catch (err) {
      setVerifyResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to send verification",
      });
    } finally {
      setSendingVerification(false);
    }
  };

  const confirmVerification = async () => {
    if (!verificationCode.trim()) {
      setVerifyResult({ success: false, message: "Please enter the verification code" });
      return;
    }

    setVerifyingCode(true);

    try {
      const res = await fetch("/api/verify/address/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // Update address to verified
      if (address) {
        setAddress({ ...address, verified: "VERIFIED" });
      }

      setVerifyResult({ success: true, message: "Address verified successfully!" });
      setVerificationCode("");
      router.refresh();
    } catch (err) {
      setVerifyResult({
        success: false,
        message: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Verified Badge */}
        {address?.verified === "VERIFIED" && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-emerald-700 font-medium">Address Verified</span>
          </div>
        )}

        {/* Street 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.street1}
            onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
            placeholder="123 Main Street"
          />
        </div>

        {/* Street 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Apartment, Suite, etc. <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.street2}
            onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
            placeholder="Apt 4B"
          />
        </div>

        {/* City and State */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
              placeholder="New York"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              State/Province <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
              placeholder="NY"
            />
          </div>
        </div>

        {/* Postal Code and Country */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
              placeholder="10001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all bg-gray-50/50 hover:bg-white text-gray-900"
              placeholder="United States"
            />
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Visibility
          </label>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
              formData.visibility === "PRIVATE"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="visibility"
                value="PRIVATE"
                checked={formData.visibility === "PRIVATE"}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as "PUBLIC" | "PRIVATE" })}
                className="sr-only"
              />
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Private</p>
                <p className="text-sm text-gray-500">Only you can see</p>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
              formData.visibility === "PUBLIC"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="visibility"
                value="PUBLIC"
                checked={formData.visibility === "PUBLIC"}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as "PUBLIC" | "PRIVATE" })}
                className="sr-only"
              />
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Public</p>
                <p className="text-sm text-gray-500">Visible on your profile</p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? "Saving..." : address ? "Update Address" : "Save Address"}
          </button>
          {address && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Public addresses will be visible on your public identity page. Private addresses are only visible to you.
        </p>
      </form>

      {/* Verification Section */}
      {address && address.verified !== "VERIFIED" && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h4 className="text-lg font-medium text-orange-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Verify Your Address
          </h4>

          {address.verified === "UNVERIFIED" && (
            <>
              <p className="text-sm text-orange-700 mb-4">
                Verify your address by receiving a letter with a verification code. This proves you have access to this physical address.
              </p>
              <button
                onClick={sendVerificationRequest}
                disabled={sendingVerification}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {sendingVerification ? "Sending..." : "Send Verification Letter"}
              </button>
            </>
          )}

          {address.verified === "PENDING" && (
            <>
              <p className="text-sm text-orange-700 mb-4">
                A verification letter has been sent to your address. Please allow 5-7 business days for delivery. Enter the 6-character code from the letter below:
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-36 px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 transition-all text-gray-900 text-center font-mono text-lg tracking-widest uppercase"
                />
                <button
                  onClick={confirmVerification}
                  disabled={verifyingCode || verificationCode.length !== 6}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {verifyingCode ? "Verifying..." : "Verify"}
                </button>
              </div>
              <button
                onClick={() => {
                  if (address) {
                    setAddress({ ...address, verified: "UNVERIFIED" });
                  }
                  setVerificationCode("");
                  setVerifyResult(null);
                }}
                className="text-sm text-orange-700 hover:text-orange-900 underline"
              >
                Request a new letter
              </button>
            </>
          )}

          {verifyResult && (
            <div className={`text-sm mt-3 ${verifyResult.success ? "text-emerald-600" : "text-red-600"}`}>
              {verifyResult.message}
              {verifyResult.devCode && (
                <span className="block mt-2 font-mono bg-white px-3 py-2 rounded border border-orange-200 text-orange-700">
                  Dev code: {verifyResult.devCode}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
