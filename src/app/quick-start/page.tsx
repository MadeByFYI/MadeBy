import Link from "next/link";

export const metadata = {
  title: "Quick Start - MadeBy",
  description: "Get started with MadeBy content attribution in 5 minutes",
};

export default function QuickStartPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-emerald-200 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span>Quick Start</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Quick Start Guide</h1>
          <p className="text-emerald-100">
            Get started with MadeBy in 5 minutes
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* What is MadeBy */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">What is MadeBy?</h2>
          <p className="text-gray-700">
            MadeBy lets you declare how your content was created and generate verifiable badges.
            Tell the world whether your work is human-made, AI-generated, or a collaboration.
          </p>
        </section>

        {/* Step 1 */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">1</div>
            <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
          </div>
          <p className="text-gray-700 mb-3">
            Sign in with Google, Microsoft, or GitHub at{" "}
            <Link href="/auth/signin" className="text-emerald-700 hover:underline">/auth/signin</Link>
          </p>
        </section>

        {/* Step 2 */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">2</div>
            <h2 className="text-xl font-bold text-gray-900">Register Your Content</h2>
          </div>
          <p className="text-gray-700 mb-3">
            Go to{" "}
            <Link href="/register" className="text-emerald-700 hover:underline">/register</Link>
            {" "}and fill out the form:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li><strong>Title</strong> - Name of your content</li>
            <li><strong>Creator Name</strong> - Your name or handle</li>
            <li><strong>Content Type</strong> - Choose one:</li>
          </ul>

          <div className="grid grid-cols-3 gap-3 mt-4 ml-4">
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center mb-2">
                <span className="text-white text-sm font-bold">HI</span>
              </div>
              <p className="text-xs text-gray-700">Human-made</p>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-2">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <p className="text-xs text-gray-700">AI-generated</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-2 relative">
                <span className="absolute top-0.5 left-1 text-white/80 text-[6px] font-bold">w/</span>
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <p className="text-xs text-gray-700">Made with AI</p>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">3</div>
            <h2 className="text-xl font-bold text-gray-900">Add a Legal Representation (Optional)</h2>
          </div>
          <p className="text-gray-700 mb-3">
            Optionally attach a legal attestation to your declaration:
          </p>
          <div className="grid gap-3 ml-4">
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
              <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Standard Assertion</p>
                <p className="text-sm text-gray-600">Good-faith declaration - no signature needed</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
              <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Gold Standard</p>
                <p className="text-sm text-gray-600">Under penalty of perjury - requires digital signature</p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">4</div>
            <h2 className="text-xl font-bold text-gray-900">Get Your Badge</h2>
          </div>
          <p className="text-gray-700 mb-3">
            After submitting, you&apos;ll get a declaration page with:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
            <li>A <strong>badge image</strong> with QR code to download</li>
            <li>An <strong>embed code</strong> to add to your website</li>
            <li>A <strong>shareable link</strong> to your declaration</li>
          </ul>
        </section>

        {/* API Quick Start */}
        <section className="mb-10 bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-3">API Quick Start</h2>
          <p className="text-gray-300 text-sm mb-4">
            Create declarations programmatically with a single API call:
          </p>
          <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
            <code className="text-sm text-green-400 whitespace-pre">{`curl -X POST https://madeby.fyi/api/content \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My Artwork",
    "creatorName": "Jane Doe",
    "contentType": "HUMAN",
    "representationCode": "STANDARD"
  }'`}</code>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Get your API key at{" "}
            <Link href="/dashboard/api-keys" className="text-emerald-400 hover:underline">/dashboard/api-keys</Link>
          </p>
        </section>

        {/* Next Steps */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Next Steps</h2>
          <div className="grid gap-3">
            <Link href="/docs" className="flex items-center gap-3 bg-white rounded-lg p-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Full Documentation</p>
                <p className="text-sm text-gray-600">Complete guide with all features</p>
              </div>
            </Link>
            <Link href="/settings/identity" className="flex items-center gap-3 bg-white rounded-lg p-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Set Up Your Identity</p>
                <p className="text-sm text-gray-600">Create a profile and verify your contact info</p>
              </div>
            </Link>
            <Link href="/docs#api-reference" className="flex items-center gap-3 bg-white rounded-lg p-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">API Reference</p>
                <p className="text-sm text-gray-600">Full API documentation for developers</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-10">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <Link href="/docs" className="text-emerald-700 hover:underline">Full Documentation →</Link>
            <Link href="/docs/api.json" className="text-emerald-700 hover:underline">API Docs (JSON)</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
