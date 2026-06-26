import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AddressForm } from "@/components/identity/AddressForm";

export default async function AddressSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const identity = await prisma.identity.findUnique({
    where: { userId: session.user.id },
    include: { mailingAddress: true },
  });

  if (!identity) {
    redirect("/settings/identity");
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/identity"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Identity Settings
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Mailing Address</h1>
            <p className="text-gray-600 mt-2">
              Manage your mailing address and its visibility
            </p>
          </div>

          {/* Address Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Your Mailing Address
              </h2>
            </div>
            <div className="p-6">
              <AddressForm initialAddress={identity.mailingAddress} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
