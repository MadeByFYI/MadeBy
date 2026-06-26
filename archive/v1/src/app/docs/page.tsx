import Link from "next/link";

export const metadata = {
  title: "Documentation - MadeBy",
  description: "Complete documentation for the MadeBy content attribution platform",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-emerald-200 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span>Documentation</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">MadeBy Documentation</h1>
          <p className="text-emerald-100 text-lg max-w-2xl">
            Complete guide to the content attribution and identity verification platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/quick-start"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Start Guide
            </Link>
            <Link
              href="/docs/api.json"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Machine-Readable API Docs (JSON)
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Quick Start Callout */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">New to MadeBy?</h3>
            <p className="text-sm text-gray-600">Get started in 5 minutes with our simplified guide.</p>
          </div>
          <Link
            href="/quick-start"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Quick Start →
          </Link>
        </div>

        {/* Table of Contents */}
        <nav className="bg-gray-50 rounded-xl p-6 mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
          <ul className="space-y-2 text-emerald-700">
            <li><a href="#overview" className="hover:underline">1. Overview</a></li>
            <li><a href="#content-types" className="hover:underline">2. Content Types</a></li>
            <li><a href="#identity-system" className="hover:underline">3. Identity System</a></li>
            <li><a href="#ai-identity" className="hover:underline">4. AI Identity Verification</a></li>
            <li><a href="#verification-methods" className="hover:underline">5. Verification Methods</a></li>
            <li><a href="#content-provenance" className="hover:underline">6. Content Provenance (C2PA &amp; SynthID)</a></li>
            <li><a href="#content-hashing" className="hover:underline">7. Content Hashing</a></li>
            <li><a href="#version-control" className="hover:underline">8. Version Control Integration</a></li>
            <li><a href="#badges" className="hover:underline">9. Badges &amp; Embedding</a></li>
            <li><a href="#legal-representations" className="hover:underline">10. Legal Representations</a></li>
            <li><a href="#api-reference" className="hover:underline">11. API Reference</a></li>
            <li><a href="#data-model" className="hover:underline">12. Data Model</a></li>
          </ul>
        </nav>

        {/* Overview */}
        <section id="overview" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">1. Overview</h2>
          <p className="text-gray-700 mb-4">
            MadeBy is a content attribution platform that allows creators to declare how their content was made and provides verifiable badges that can be embedded in or alongside creative works.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Core Purpose</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Declare whether content was made by humans, AI, or a collaboration of both</li>
            <li>Create verifiable identities for individuals, organizations, and AI agents</li>
            <li>Generate scannable badges with QR codes linking to declarations</li>
            <li>Build trust through identity verification (email, phone, domain, address)</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>Register:</strong> Create an account and set up your identity profile</li>
            <li><strong>Verify:</strong> Optionally verify your identity through email, phone, domain, or physical address</li>
            <li><strong>Declare:</strong> Register your content with its attribution type (HI, AI, or With AI)</li>
            <li><strong>Share:</strong> Download badges and embed codes to display with your content</li>
          </ol>
        </section>

        {/* Content Types */}
        <section id="content-types" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">2. Content Types</h2>
          <p className="text-gray-700 mb-6">
            Every content declaration must specify one of three attribution types:
          </p>

          <div className="grid gap-4">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">HI</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Made by Human Intelligence (HUMAN)</h3>
                  <p className="text-sm text-gray-600">Code: <code className="bg-white px-2 py-0.5 rounded">HUMAN</code></p>
                </div>
              </div>
              <p className="text-gray-700">
                Content created entirely by human intelligence without AI assistance. This includes traditional artwork, writing, music, code, and any other creative work produced solely by humans.
              </p>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">AI</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Made by Artificial Intelligence (AI)</h3>
                  <p className="text-sm text-gray-600">Code: <code className="bg-white px-2 py-0.5 rounded">AI</code></p>
                </div>
              </div>
              <p className="text-gray-700">
                Content generated entirely by AI systems with minimal human direction. Examples include AI-generated images, text, music, or code where humans only provided the initial prompt.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center relative">
                  <span className="absolute top-1 left-1.5 text-white/80 text-[8px] font-bold">w/</span>
                  <span className="text-white text-lg font-bold">AI</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Made with AI Assistance (WITH_AI)</h3>
                  <p className="text-sm text-gray-600">Code: <code className="bg-white px-2 py-0.5 rounded">WITH_AI</code></p>
                </div>
              </div>
              <p className="text-gray-700">
                Content created through human-AI collaboration. The human provides significant creative direction, editing, or refinement while using AI as a tool. Examples include AI-assisted writing, artwork with AI enhancements, or code written with AI pair programming.
              </p>
            </div>
          </div>
        </section>

        {/* Identity System */}
        <section id="identity-system" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">3. Identity System</h2>
          <p className="text-gray-700 mb-6">
            MadeBy supports three types of identities:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Individual</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-sm">INDIVIDUAL</code></td>
                  <td className="px-4 py-3 text-gray-700">A human person creating content</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Organization</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-sm">CORPORATE</code></td>
                  <td className="px-4 py-3 text-gray-700">A company, studio, or collective</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">AI</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-sm">AI</code></td>
                  <td className="px-4 py-3 text-gray-700">An AI system (Claude, GPT-4, Gemini, etc.)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Identity Components</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Handle:</strong> Unique username (e.g., @johndoe) that creates a public profile URL</li>
            <li><strong>Display Name:</strong> Public-facing name shown on the profile</li>
            <li><strong>Bio:</strong> Description or biography</li>
            <li><strong>Avatar:</strong> Profile image</li>
            <li><strong>Contact Info:</strong> Emails, phones, domains, and mailing address (with visibility controls)</li>
          </ul>
        </section>

        {/* AI Identity Verification */}
        <section id="ai-identity" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">4. AI Identity Verification</h2>
          <p className="text-gray-700 mb-4">
            AI identities have special configuration and verification requirements:
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">AI Configuration</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Provider:</strong> The AI company (Anthropic, OpenAI, Google, Meta, Mistral, Cohere)</li>
            <li><strong>Model:</strong> Specific model (Claude Opus, GPT-4, Gemini Pro, etc.)</li>
            <li><strong>Model Version:</strong> Exact version identifier (e.g., claude-opus-4-5-20251101)</li>
            <li><strong>Operator:</strong> The human or organization responsible for the AI identity</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Provider Verification</h3>
          <p className="text-gray-700 mb-4">
            AI identities can be verified by connecting to their provider&apos;s API. This allows verification of API usage and strengthens attestations for content created by the AI.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Attestation Levels</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Self-Reported</td>
                  <td className="px-4 py-3 text-gray-700">User claims AI involvement, no proof</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Local Log</td>
                  <td className="px-4 py-3 text-gray-700">Verified via local tool logs (e.g., Claude Code request IDs)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Provider Corroborated</td>
                  <td className="px-4 py-3 text-gray-700">Cross-referenced with provider usage data</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Provider Verified</td>
                  <td className="px-4 py-3 text-gray-700">Directly confirmed by provider API (future)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Verification Methods */}
        <section id="verification-methods" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">5. Verification Methods</h2>
          <p className="text-gray-700 mb-6">
            Identities can be verified through multiple channels:
          </p>

          <div className="grid gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Email Verification</h3>
              <p className="text-gray-700 text-sm">
                Receive a verification code via email and confirm ownership. The login email is automatically verified.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Phone Verification</h3>
              <p className="text-gray-700 text-sm">
                Receive an SMS verification code and confirm ownership of the phone number.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Domain Verification</h3>
              <p className="text-gray-700 text-sm">
                Verify domain ownership by adding a DNS TXT record or uploading a verification file to your website.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Address Verification</h3>
              <p className="text-gray-700 text-sm">
                Receive a physical postcard with a verification code to confirm your mailing address.
              </p>
            </div>
          </div>
        </section>

        {/* Content Provenance */}
        <section id="content-provenance" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">6. Content Provenance (C2PA &amp; SynthID)</h2>
          <p className="text-gray-700 mb-6">
            MadeBy can automatically detect AI-generated content through embedded metadata and watermarks, providing additional verification beyond self-reported declarations.
          </p>

          <div className="grid gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C2PA</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">C2PA (Coalition for Content Provenance and Authenticity)</h3>
                  <p className="text-sm text-gray-600">Industry-standard cryptographic provenance</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                C2PA is an open standard that embeds cryptographically signed manifests into content files. When an image is created or edited, the tool can sign a &quot;claim&quot; with its certificate, creating a verifiable chain of provenance.
              </p>
              <div className="bg-white/50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900 mb-2">Supported Providers:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li><strong>OpenAI DALL-E 3:</strong> Embeds C2PA metadata identifying OpenAI as creator</li>
                  <li><strong>Adobe Firefly/Photoshop:</strong> Embeds Adobe Content Credentials</li>
                  <li><strong>Microsoft Designer:</strong> Embeds C2PA provenance data</li>
                </ul>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">SynthID</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">SynthID by Google DeepMind</h3>
                  <p className="text-sm text-gray-600">Imperceptible pixel-level watermarking</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                SynthID embeds an invisible watermark directly into the pixels of AI-generated images. Unlike metadata, this watermark survives many common image modifications like cropping, resizing, and compression.
              </p>
              <div className="bg-white/50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900 mb-2">Characteristics:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Imperceptible to human eyes</li>
                  <li>Survives JPEG compression, resizing, cropping</li>
                  <li>Detection returns confidence score (0-1)</li>
                  <li>Used by Google Imagen and Gemini image generation</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How Provenance Detection Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>User uploads image content when creating a declaration</li>
            <li>System automatically scans for C2PA manifests and SynthID watermarks</li>
            <li>If detected, provenance data is stored and linked to the content</li>
            <li>Declaration page shows provenance badge indicating verified AI origin</li>
            <li>Original generator tool/model is identified when possible</li>
          </ol>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Provenance Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">DETECTED</code></td>
                  <td className="px-4 py-3 text-gray-700">Watermark or metadata was found and validated</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">NOT_DETECTED</code></td>
                  <td className="px-4 py-3 text-gray-700">No provenance data found (content may still be AI-generated)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-red-100 text-red-800 px-2 py-0.5 rounded">TAMPERED</code></td>
                  <td className="px-4 py-3 text-gray-700">Evidence of modification that invalidated provenance</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">PENDING</code></td>
                  <td className="px-4 py-3 text-gray-700">Analysis is in progress</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-6">
            <h4 className="font-semibold text-amber-900 mb-2">EU AI Act Compliance</h4>
            <p className="text-amber-800 text-sm">
              The EU AI Act (Article 50) requires AI providers to mark outputs in machine-readable format by August 2026. MadeBy&apos;s provenance detection and content declarations help creators and platforms meet these transparency requirements.
            </p>
          </div>
        </section>

        {/* Content Hashing */}
        <section id="content-hashing" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">7. Content Hashing</h2>
          <p className="text-gray-700 mb-6">
            Content declarations can include a cryptographic hash of the content to enable integrity verification. This allows anyone to later verify that the content hasn&apos;t been modified since the declaration was made.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Purpose</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Verify content hasn&apos;t been modified since declaration</li>
            <li>Detect tampering or unauthorized changes</li>
            <li>Create unique fingerprint for content identification</li>
            <li>Enable content-addressable lookups</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Supported Algorithms</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Algorithm</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Output</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">SHA-256</td>
                  <td className="px-4 py-3 text-gray-700">256 bits</td>
                  <td className="px-4 py-3"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Recommended</span></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">SHA-512</td>
                  <td className="px-4 py-3 text-gray-700">512 bits</td>
                  <td className="px-4 py-3 text-gray-700">High security applications</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">SHA3-256</td>
                  <td className="px-4 py-3 text-gray-700">256 bits</td>
                  <td className="px-4 py-3 text-gray-700">Modern alternative</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">BLAKE3</td>
                  <td className="px-4 py-3 text-gray-700">256 bits</td>
                  <td className="px-4 py-3 text-gray-700">Fastest, modern</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">MD5</td>
                  <td className="px-4 py-3 text-gray-700">128 bits</td>
                  <td className="px-4 py-3"><span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">Legacy only</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Hash Targets</h3>
          <div className="grid gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <code className="text-emerald-700 font-medium">FILE</code>
              <p className="text-sm text-gray-600 mt-1">Hash the raw bytes of an uploaded file. Best for images, videos, and documents.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <code className="text-emerald-700 font-medium">URL_CONTENT</code>
              <p className="text-sm text-gray-600 mt-1">Hash the content fetched from originalUrl at declaration time.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <code className="text-emerald-700 font-medium">TEXT_CONTENT</code>
              <p className="text-sm text-gray-600 mt-1">Hash the text/description field. Useful for text-only declarations.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <code className="text-emerald-700 font-medium">COMBINED</code>
              <p className="text-sm text-gray-600 mt-1">Hash multiple elements together (e.g., title + description + file).</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Verification Workflow</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>User uploads content file or provides URL when creating declaration</li>
            <li>System computes hash using selected algorithm and stores it</li>
            <li>Hash, algorithm, target, input size, and filename are saved with declaration</li>
            <li>Later: re-hash the content and compare to the stored hash</li>
            <li>Match confirms integrity; mismatch indicates the content was modified</li>
          </ol>

          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <p className="text-gray-400 text-xs mb-2"># Example: Verify a file hash locally</p>
            <code className="text-sm text-green-400">
              sha256sum artwork.png<br/>
              # Compare output with contentHash from declaration
            </code>
          </div>
        </section>

        {/* Version Control */}
        <section id="version-control" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">8. Version Control Integration</h2>
          <p className="text-gray-700 mb-6">
            Content declarations can include a reference to a specific git commit, enabling precise tracking of version-controlled content like code, documentation, or configuration files.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Purpose</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Link declarations to specific versions of source code or project files</li>
            <li>Enable precise tracking of when content was created relative to repository history</li>
            <li>Allow verification by checking out the exact commit referenced</li>
            <li>Support attribution for code and technical documentation</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Git Reference Fields</h3>
          <div className="grid gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <code className="text-emerald-700 font-medium">gitCommitHash</code>
              <p className="text-sm text-gray-600 mt-1">The git commit SHA. Can be full 40-character hash or abbreviated (7+ characters).</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <code className="text-emerald-700 font-medium">gitRepositoryUrl</code>
              <p className="text-sm text-gray-600 mt-1">URL to the repository (GitHub, GitLab, Bitbucket, etc.). Used to link to the commit.</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Example Usage</h3>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-6">
            <code className="text-sm text-green-400">
              {`# Get your current commit hash
git rev-parse HEAD
# a1b2c3d4e5f6...

# Or the short form
git rev-parse --short HEAD
# a1b2c3d`}
            </code>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Verification Workflow</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-6">
            <li>User creates content as part of a git-tracked project</li>
            <li>User commits changes and notes the commit hash</li>
            <li>User creates a declaration with the git commit hash and repository URL</li>
            <li>Anyone can verify by checking out the commit and reviewing the content</li>
          </ol>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h4 className="font-semibold text-blue-900 mb-2">Combine with Content Hashing</h4>
            <p className="text-blue-800 text-sm">
              For maximum verification, combine git commit references with content hashing. The git commit provides version tracking while the content hash ensures the file hasn&apos;t been modified.
            </p>
          </div>
        </section>

        {/* Badges */}
        <section id="badges" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">9. Badges &amp; Embedding</h2>
          <p className="text-gray-700 mb-6">
            Each content declaration generates badges that can be downloaded or embedded:
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Badge Types</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Standard Badge:</strong> Full badge with QR code linking to the declaration page</li>
            <li><strong>Simple Badge:</strong> Minimal version without QR code for tight spaces</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Badge URLs</h3>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <code className="text-sm text-green-400">
              GET /api/content/&#123;id&#125;/badge      # Full badge with QR code<br/>
              GET /api/content/&#123;id&#125;/badge-simple  # Simple badge without QR
            </code>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Embed Code</h3>
          <p className="text-gray-700 mb-3">
            HTML embed code is provided for each declaration to easily add badges to websites:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <code className="text-sm text-green-400">
              {`<a href="https://madeby.example/declaration/{id}">
  <img src="https://madeby.example/api/content/{id}/badge"
       alt="Content Attribution Badge" />
</a>`}
            </code>
          </div>
        </section>

        {/* Legal Representations */}
        <section id="legal-representations" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">10. Legal Representations</h2>
          <p className="text-gray-700 mb-6">
            Legal representations are optional attestations that creators can attach to their content declarations. They provide different levels of legal weight to the declaration.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <h4 className="font-semibold text-amber-900 mb-2">Important Disclaimer</h4>
            <p className="text-amber-800 text-sm">
              MadeBy.fyi records that users created badges and associated them with legal representations. <strong>MadeBy.fyi does NOT assert that the declarations are true.</strong> The legal representation is between the declarant and any party relying on the declaration.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Available Representations</h3>

          <div className="grid gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Standard Assertion</h3>
                  <p className="text-sm text-gray-600">Code: <code className="bg-white px-2 py-0.5 rounded">STANDARD</code></p>
                </div>
              </div>
              <p className="text-gray-700 mb-3">
                A good-faith assertion based on current knowledge. This is a simple declaration that the badge has been applied correctly to the best of the declarant&apos;s knowledge.
              </p>
              <div className="bg-white/50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900 mb-1">Assertion Text:</p>
                <p className="text-gray-700 italic">&quot;I have applied the correct badge to the content to the best of my knowledge.&quot;</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Gold Standard Assertion</h3>
                  <p className="text-sm text-gray-600">Code: <code className="bg-white px-2 py-0.5 rounded">PERJURY</code></p>
                </div>
              </div>
              <p className="text-gray-700 mb-3">
                A declaration under penalty of perjury under the laws of the United States of America. This carries significant legal weight and requires a digital signature.
              </p>
              <div className="bg-white/50 rounded-lg p-4 text-sm mb-3">
                <p className="font-medium text-gray-900 mb-1">Assertion Text:</p>
                <p className="text-gray-700 italic">&quot;I have applied the correct badge to the content to the best of my knowledge.</p>
                <p className="text-gray-700 italic mt-2">I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct.&quot;</p>
              </div>
              <div className="bg-amber-100/50 rounded-lg p-4 text-sm">
                <p className="font-medium text-amber-900 mb-1">Requirements:</p>
                <ul className="list-disc list-inside text-amber-800 space-y-1">
                  <li>Digital signature (typed full legal name)</li>
                  <li>Date of signature (auto-populated)</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Legal Implications</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Aspect</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Standard</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Gold Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Legal Weight</td>
                  <td className="px-4 py-3 text-gray-700">Good-faith assertion</td>
                  <td className="px-4 py-3 text-gray-700">Same effect as sworn statement</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">False Statement</td>
                  <td className="px-4 py-3 text-gray-700">Potential civil liability</td>
                  <td className="px-4 py-3 text-gray-700">Federal crime (18 U.S.C. &sect; 1621)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Signature</td>
                  <td className="px-4 py-3 text-gray-700">Not required</td>
                  <td className="px-4 py-3 text-gray-700">Required (digital signature)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">Modification</td>
                  <td className="px-4 py-3 text-gray-700">Can update declaration</td>
                  <td className="px-4 py-3 text-gray-700">Original signature retained</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">API Usage</h3>
          <p className="text-gray-700 mb-3">
            When creating content via the API, you can specify a legal representation using either the representation ID or code:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-6">
            <p className="text-gray-400 text-xs mb-2"># Using representation code (recommended)</p>
            <code className="text-sm text-green-400">
              {`POST /api/content
{
  "title": "My Artwork",
  "creatorName": "Jane Doe",
  "contentType": "HUMAN",
  "representationCode": "STANDARD"
}`}
            </code>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <p className="text-gray-400 text-xs mb-2"># Gold Standard with required signature</p>
            <code className="text-sm text-green-400">
              {`POST /api/content
{
  "title": "My Artwork",
  "creatorName": "Jane Doe",
  "contentType": "HUMAN",
  "representationCode": "PERJURY",
  "signatureName": "Jane Doe"
}`}
            </code>
          </div>
        </section>

        {/* API Reference */}
        <section id="api-reference" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">11. API Reference</h2>
          <p className="text-gray-700 mb-6">
            All API endpoints require authentication unless noted. See the{" "}
            <Link href="/docs/api.json" className="text-emerald-700 hover:underline">
              machine-readable API documentation
            </Link>{" "}
            for complete details.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Authentication</h3>
          <p className="text-gray-700 mb-4">
            API requests can be authenticated via session cookies (web) or API keys (programmatic access).
            Include your API key in the Authorization header:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-6">
            <code className="text-sm text-green-400">
              Authorization: Bearer mk_your_api_key_here
            </code>
          </div>
          <p className="text-gray-700 mb-6">
            API keys can be created and managed at <code className="bg-gray-100 px-2 py-0.5 rounded">/dashboard/api-keys</code>.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Content Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Endpoint</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/content</code></td>
                  <td className="px-4 py-3 text-gray-700">List authenticated user&apos;s content declarations</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/content</code></td>
                  <td className="px-4 py-3 text-gray-700">Create new content declaration</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/content/&#123;id&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Get content declaration details (public)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">PATCH</code></td>
                  <td className="px-4 py-3"><code>/api/content/&#123;id&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Update content declaration (owner only)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-red-100 text-red-800 px-2 py-0.5 rounded">DELETE</code></td>
                  <td className="px-4 py-3"><code>/api/content/&#123;id&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Delete content declaration (owner only)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/content/&#123;id&#125;/badge</code></td>
                  <td className="px-4 py-3 text-gray-700">Get badge image with QR code (PNG)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/content/&#123;id&#125;/badge-simple</code></td>
                  <td className="px-4 py-3 text-gray-700">Get simple badge without QR code (PNG)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Identity Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Endpoint</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/identity</code></td>
                  <td className="px-4 py-3 text-gray-700">Get current user&apos;s identity</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity</code></td>
                  <td className="px-4 py-3 text-gray-700">Create identity</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">PATCH</code></td>
                  <td className="px-4 py-3"><code>/api/identity</code></td>
                  <td className="px-4 py-3 text-gray-700">Update identity</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/identity/&#123;handle&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Get public profile by handle</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity/handle/check</code></td>
                  <td className="px-4 py-3 text-gray-700">Check handle availability</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/identity/emails</code></td>
                  <td className="px-4 py-3 text-gray-700">List identity emails</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity/emails</code></td>
                  <td className="px-4 py-3 text-gray-700">Add email to identity</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">PATCH</code></td>
                  <td className="px-4 py-3"><code>/api/identity/emails/&#123;id&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Update email</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-red-100 text-red-800 px-2 py-0.5 rounded">DELETE</code></td>
                  <td className="px-4 py-3"><code>/api/identity/emails/&#123;id&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Delete email</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/identity/phones</code></td>
                  <td className="px-4 py-3 text-gray-700">List identity phones</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity/phones</code></td>
                  <td className="px-4 py-3 text-gray-700">Add phone to identity</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/identity/domains</code></td>
                  <td className="px-4 py-3 text-gray-700">List identity domains</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity/domains</code></td>
                  <td className="px-4 py-3 text-gray-700">Add domain to identity</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/identity/address</code></td>
                  <td className="px-4 py-3 text-gray-700">Get mailing address</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity/address</code></td>
                  <td className="px-4 py-3 text-gray-700">Create mailing address</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/identity/provider-credential</code></td>
                  <td className="px-4 py-3 text-gray-700">Add AI provider credential</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Verification Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Endpoint</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/email/send</code></td>
                  <td className="px-4 py-3 text-gray-700">Send email verification link</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/email/confirm</code></td>
                  <td className="px-4 py-3 text-gray-700">Confirm email with token</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/phone/send</code></td>
                  <td className="px-4 py-3 text-gray-700">Send SMS/voice verification code</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/phone/confirm</code></td>
                  <td className="px-4 py-3 text-gray-700">Confirm phone with code</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/domain/check</code></td>
                  <td className="px-4 py-3 text-gray-700">Check DNS TXT record for domain verification</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/address/send</code></td>
                  <td className="px-4 py-3 text-gray-700">Send physical verification letter</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/verify/address/confirm</code></td>
                  <td className="px-4 py-3 text-gray-700">Confirm address with postal code</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Legal Representation Endpoints</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Endpoint</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/representations</code></td>
                  <td className="px-4 py-3 text-gray-700">List available legal representations</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">API Key Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Endpoint</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3"><code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">GET</code></td>
                  <td className="px-4 py-3"><code>/api/keys</code></td>
                  <td className="px-4 py-3 text-gray-700">List user&apos;s API keys (session auth only)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</code></td>
                  <td className="px-4 py-3"><code>/api/keys</code></td>
                  <td className="px-4 py-3 text-gray-700">Create new API key (session auth only)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="bg-red-100 text-red-800 px-2 py-0.5 rounded">DELETE</code></td>
                  <td className="px-4 py-3"><code>/api/keys/&#123;id&#125;</code></td>
                  <td className="px-4 py-3 text-gray-700">Revoke or delete API key (session auth only)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Data Model */}
        <section id="data-model" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">12. Data Model</h2>
          <p className="text-gray-700 mb-6">
            Key entities in the MadeBy system:
          </p>

          <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-800">{`User
├── Identity
│   ├── identityType: INDIVIDUAL | CORPORATE | AI
│   ├── handle: @username
│   ├── displayName, bio, avatarUrl
│   ├── IdentityAIConfig (if AI)
│   │   ├── provider: ANTHROPIC | OPENAI | GOOGLE | STABILITY | MIDJOURNEY | ADOBE | ...
│   │   ├── model: CLAUDE_OPUS | GPT_4 | DALL_E_3 | IMAGEN | STABLE_DIFFUSION | ...
│   │   ├── modelVersion
│   │   └── operator → Identity
│   ├── emails[], phones[], domains[]
│   ├── mailingAddress
│   └── providerCredentials[]
└── Content[]
    ├── contentType: HUMAN | AI | WITH_AI
    ├── title, description
    ├── creatorName, owner
    ├── originalUrl, thumbnailUrl
    ├── collaborators, aiToolsUsed
    ├── contentHash, hashAlgorithm, hashTarget
    ├── hashCreatedAt, hashInputSize, hashInputFilename
    ├── gitCommitHash, gitRepositoryUrl
    ├── contributors[]
    │   └── AIAttestation[]
    │       ├── requestId
    │       ├── timestamp
    │       ├── provider, model
    │       ├── source: CLAUDE_CODE_LOG | C2PA_METADATA | SYNTHID_DETECTED | ...
    │       └── level: SELF_REPORTED | LOCAL_LOG | ...
    ├── provenance[]
    │   └── ContentProvenance
    │       ├── provenanceType: C2PA | SYNTHID | ADOBE_CR | IPTC | EXIF
    │       ├── status: DETECTED | NOT_DETECTED | TAMPERED | INVALID
    │       ├── c2paManifest, c2paClaimGenerator, c2paSignature
    │       ├── synthidConfidence, synthidVersion
    │       ├── generatorModel, generatorProvider
    │       └── detectedAt, verificationMethod
    └── representationAcceptance
        └── RepresentationAcceptance
            ├── representation → LegalRepresentation
            │   ├── code: "STANDARD" | "PERJURY"
            │   ├── assertionLevel: STANDARD | PERJURY
            │   ├── name, shortDescription
            │   ├── assertionText, fullLegalText
            │   └── isActive
            ├── acceptedByName
            ├── acceptedAt
            ├── legalTextSnapshot
            ├── signatureName (for PERJURY)
            └── signatureDate (for PERJURY)`}</pre>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 mt-16">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <div className="flex gap-4">
              <Link href="/" className="text-emerald-700 hover:underline text-sm">Home</Link>
              <Link href="/quick-start" className="text-emerald-700 hover:underline text-sm">Quick Start</Link>
              <Link href="/docs/api.json" className="text-emerald-700 hover:underline text-sm">API (JSON)</Link>
              <Link href="/register" className="text-emerald-700 hover:underline text-sm">Register Content</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
