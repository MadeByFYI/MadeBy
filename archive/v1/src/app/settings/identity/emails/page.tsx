import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmailList } from "@/components/identity/EmailList";

export default async function EmailsSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const identity = await prisma.identity.findUnique({
    where: { userId: session.user.id },
    include: {
      emails: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });

  if (!identity) {
    redirect("/settings/identity");
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />

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
            <h1 className="text-3xl font-bold text-gray-900">Email Addresses</h1>
            <p className="text-gray-600 mt-2">
              Manage your email addresses and their visibility
            </p>
          </div>

          {/* Email List */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Your Email Addresses
              </h2>
            </div>
            <div className="p-6">
              <EmailList initialEmails={identity.emails} loginEmail={session.user.email || undefined} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
