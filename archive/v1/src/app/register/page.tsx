import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RegistrationForm } from "@/components/RegistrationForm";
import { prisma } from "@/lib/db";

export default async function RegisterPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/register");
  }

  // Fetch the user's identity to get their display name
  const identity = await prisma.identity.findUnique({
    where: { userId: session.user.id },
    select: { displayName: true },
  });

  // Use identity display name, then session name, then empty string
  const defaultCreatorName = identity?.displayName || session.user.name || "";

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-gradient-to-br from-emerald-200 to-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-700 font-medium">Make Your Declaration</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Register Your Content
            </h1>
            <p className="text-gray-600 max-w-lg mx-auto">
              Declare how your content was made and get a badge to share with the world.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex justify-center gap-4 mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              My Declarations
            </Link>
            <Link
              href="/settings/identity"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Identity
            </Link>
          </div>

          {/* Registration Form Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                New Content Declaration
              </h2>
            </div>
            <div className="p-6 md:p-8">
              <RegistrationForm defaultCreatorName={defaultCreatorName} />
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-sm font-bold">HI</span>
              </div>
              <p className="text-sm font-medium text-cyan-800">Made By HI</p>
              <p className="text-xs text-cyan-600">100% Human Intelligence</p>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <p className="text-sm font-medium text-pink-800">Made By AI</p>
              <p className="text-xs text-pink-600">100% AI Generated</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2 relative">
                <span className="absolute top-[18%] left-[12%] text-white/90 text-[6px] font-bold">w/</span>
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <p className="text-sm font-medium text-purple-800">Made With AI</p>
              <p className="text-xs text-purple-600">Human + AI Collaboration</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
