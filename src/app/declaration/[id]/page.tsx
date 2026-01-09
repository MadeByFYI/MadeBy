import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EmbedCodeSection } from "@/components/EmbedCodeSection";
import { BadgeDownloadSection } from "@/components/BadgeDownloadSection";

interface DeclarationPageProps {
  params: Promise<{ id: string }>;
}

const CONTENT_TYPE_CONFIG = {
  HUMAN: {
    label: "Made by Human Intelligence",
    shortLabel: "Human Intelligence",
    gradient: "from-cyan-400 to-cyan-600",
    bgGradient: "from-cyan-500/10 via-transparent to-transparent",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    tagBg: "bg-cyan-100 text-cyan-700",
    icon: "HI",
  },
  AI: {
    label: "Made by Artificial Intelligence",
    shortLabel: "Artificial Intelligence",
    gradient: "from-pink-400 to-pink-600",
    bgGradient: "from-pink-500/10 via-transparent to-transparent",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    tagBg: "bg-pink-100 text-pink-700",
    icon: "AI",
  },
  WITH_AI: {
    label: "Made with Artificial Intelligence",
    shortLabel: "AI Assisted",
    gradient: "from-purple-400 to-purple-600",
    bgGradient: "from-purple-500/10 via-transparent to-transparent",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    tagBg: "bg-purple-100 text-purple-700",
    icon: "AI",
  },
};

export default async function DeclarationPage({ params }: DeclarationPageProps) {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          identity: {
            select: {
              handle: true,
            },
          },
        },
      },
    },
  });

  if (!content) {
    notFound();
  }

  const collaborators = content.collaborators
    ? JSON.parse(content.collaborators)
    : [];
  const aiToolsUsed = content.aiToolsUsed
    ? JSON.parse(content.aiToolsUsed)
    : [];

  const config = CONTENT_TYPE_CONFIG[content.contentType];

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.bgGradient} pointer-events-none`} />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-cyan-200 to-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Declaration Header */}
          <div className="text-center mb-10">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} ${config.border} border mb-4`}>
              <svg className={`w-5 h-5 ${config.color}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className={`font-semibold ${config.color}`}>Content Declaration</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              {content.title}
            </h1>
            <p className="text-lg text-gray-600">
              <span className={`font-semibold ${config.color}`}>{config.label}</span>
            </p>
          </div>

          {/* Badge Display Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className={`bg-gradient-to-r ${config.gradient} px-6 py-4`}>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Authentication Badges
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Share This Declaration</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Share this link so others can see this content&apos;s origin
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 truncate">
                    {baseUrl}/declaration/{id}
                  </code>
                  <CopyLinkButton
                    url={`${baseUrl}/declaration/${id}`}
                    className="px-4 py-3"
                  />
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

          {/* Content Details Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Content Details
              </h2>
            </div>

            <div className="p-6">
              {/* Description */}
              {content.description && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">{content.description}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Creator */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Creator</p>
                      {content.user?.identity?.handle ? (
                        <Link
                          href={`/${content.user.identity.handle}`}
                          className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline transition-colors"
                        >
                          {content.creatorName}
                        </Link>
                      ) : (
                        <p className="text-gray-900 font-semibold">{content.creatorName}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Owner */}
                {content.owner && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Owner</p>
                        {content.owner.startsWith("@") ? (
                          <Link
                            href={`/${content.owner.slice(1)}`}
                            className="text-emerald-700 font-semibold hover:text-emerald-800 hover:underline transition-colors"
                          >
                            {content.owner}
                          </Link>
                        ) : (
                          <p className="text-gray-900 font-semibold">{content.owner}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Registration Date */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Registered</p>
                      <p className="text-gray-900 font-semibold">
                        {new Date(content.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Original URL */}
              {content.originalUrl && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Original Content</p>
                  <a
                    href={content.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 ${config.bg} ${config.border} border rounded-lg ${config.color} hover:opacity-80 transition-opacity`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="truncate max-w-md">{content.originalUrl}</span>
                  </a>
                </div>
              )}

              {/* Attribution */}
              {content.attribution && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attribution</p>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{content.attribution}</p>
                  </div>
                </div>
              )}

              {/* Collaborators */}
              {collaborators.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Collaborators</p>
                  <div className="flex flex-wrap gap-2">
                    {collaborators.map((collab: string, index: number) => {
                      const isHandle = collab.startsWith("@");
                      const handle = isHandle ? collab.slice(1) : null;

                      if (isHandle && handle) {
                        return (
                          <Link
                            key={index}
                            href={`/${handle}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {collab}
                          </Link>
                        );
                      }

                      return (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {collab}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Tools Used */}
              {aiToolsUsed.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">AI Tools Used</p>
                  <div className="flex flex-wrap gap-2">
                    {aiToolsUsed.map((tool: string, index: number) => (
                      <span
                        key={index}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${config.tagBg}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content ID Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content ID</p>
                <code className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-mono">
                  {content.id}
                </code>
              </div>
            </div>
          </div>

          {/* Register CTA */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Register Your Own Content</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Declare your content&apos;s origin and get a badge to share with the world.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Register Content
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
