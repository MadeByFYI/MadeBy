import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmbedCodeSection } from "@/components/EmbedCodeSection";
import { BadgeDownloadSection } from "@/components/BadgeDownloadSection";

interface SuccessPageProps {
  params: Promise<{ id: string }>;
}

const CONTENT_TYPE_CONFIG = {
  HUMAN: {
    label: "Made by Human Intelligence",
    shortLabel: "Made By HI",
    gradient: "from-cyan-400 to-cyan-600",
    bgGradient: "from-cyan-500/10 via-transparent to-transparent",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    ring: "ring-cyan-500",
  },
  AI: {
    label: "Made by Artificial Intelligence",
    shortLabel: "Made By AI",
    gradient: "from-pink-400 to-pink-600",
    bgGradient: "from-pink-500/10 via-transparent to-transparent",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    ring: "ring-pink-500",
  },
  WITH_AI: {
    label: "Made with Artificial Intelligence",
    shortLabel: "Made With AI",
    gradient: "from-purple-400 to-purple-600",
    bgGradient: "from-purple-500/10 via-transparent to-transparent",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    ring: "ring-purple-600",
  },
};

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const content = await prisma.content.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      contentType: true,
      owner: true,
    },
  });

  if (!content) {
    notFound();
  }

  const config = CONTENT_TYPE_CONFIG[content.contentType];

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.bgGradient} pointer-events-none`} />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-cyan-200 to-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-10">
            {/* Animated success icon */}
            <div className="relative inline-flex mb-6">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Ping animation */}
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} animate-ping opacity-20`} />
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Content Registered!
            </h1>
            <p className="text-lg text-gray-600">
              Your content <span className="font-semibold text-gray-900">&quot;{content.title}&quot;</span> has been successfully registered as
            </p>
            <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${config.bg} ${config.border} border`}>
              <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${config.gradient}`} />
              <span className={`font-semibold ${config.color}`}>{config.label}</span>
            </div>
            {content.owner && (
              <p className="mt-3 text-gray-600">
                Owned by{" "}
                {content.owner.startsWith("@") ? (
                  <Link
                    href={`/${content.owner.slice(1)}`}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
                  >
                    {content.owner}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900">{content.owner}</span>
                )}
              </p>
            )}
          </div>

          {/* Badge Cards */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className={`bg-gradient-to-r ${config.gradient} px-6 py-4`}>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Your Badges
              </h2>
            </div>

            <BadgeDownloadSection contentId={id} contentType={content.contentType} />
          </div>

          {/* Share Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <svg className={`w-6 h-6 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Share Your Declaration</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Share this link so others can see your content&apos;s origin
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 truncate">
                    {baseUrl}/declaration/{id}
                  </code>
                  <CopyLinkButton
                    url={`${baseUrl}/declaration/${id}`}
                    className="px-4 py-3"
                  />
                  <Link
                    href={`/declaration/${id}`}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Embed Code Section */}
          <EmbedCodeSection
            contentId={id}
            contentType={content.contentType}
            verifyUrl={`${baseUrl}/declaration/${id}`}
          />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all text-center shadow-sm"
            >
              Register Another
            </Link>
            <Link
              href={`/declaration/${id}`}
              className={`px-8 py-4 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-semibold hover:opacity-90 transition-all text-center shadow-lg hover:shadow-xl`}
            >
              View Declaration Page
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
