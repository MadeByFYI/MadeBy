import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ApiKeyManager } from "@/components/dashboard/ApiKeyManager";

export default async function ApiKeysPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard/api-keys");
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-gradient-to-br from-emerald-200 to-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
              Dashboard
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900">API Keys</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
                <p className="text-gray-600">Manage your API keys for programmatic access</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">API Access</p>
                <p className="text-sm text-blue-700 mt-1">
                  Use API keys to access the MadeBy API programmatically. Include your key in the
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded mx-1">Authorization: Bearer mk_xxx</code>
                  header.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Manager Component */}
          <ApiKeyManager />

          {/* Documentation Link */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">API Documentation</h3>
            <p className="text-sm text-gray-600 mb-3">
              Learn how to use the MadeBy API to create content declarations, manage identities, and more.
            </p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              View API Documentation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
