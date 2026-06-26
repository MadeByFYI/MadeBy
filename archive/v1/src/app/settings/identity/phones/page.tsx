import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PhoneList } from "@/components/identity/PhoneList";

export default async function PhonesSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const identity = await prisma.identity.findUnique({
    where: { userId: session.user.id },
    include: {
      phones: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });

  if (!identity) {
    redirect("/settings/identity");
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent pointer-events-none" />

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
            <h1 className="text-3xl font-bold text-gray-900">Phone Numbers</h1>
            <p className="text-gray-600 mt-2">
              Manage your contact phone numbers here.
            </p>
          </div>

          {/* Phone List */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Your Phone Numbers
              </h2>
            </div>
            <div className="p-6">
              <PhoneList initialPhones={identity.phones} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
