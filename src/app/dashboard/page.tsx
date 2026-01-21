import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CopyEmbedButton } from "@/components/CopyEmbedButton";

const CONTENT_TYPE_CONFIG = {
  HUMAN: {
    label: "Made by HI",
    fullLabel: "Human Intelligence",
    gradient: "from-cyan-400 to-cyan-600",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    iconBg: "bg-cyan-100",
  },
  AI: {
    label: "Made by AI",
    fullLabel: "Artificial Intelligence",
    gradient: "from-pink-400 to-pink-600",
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    iconBg: "bg-pink-100",
  },
  WITH_AI: {
    label: "Made with AI",
    fullLabel: "AI Assisted",
    gradient: "from-purple-400 to-purple-600",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    iconBg: "bg-purple-100",
  },
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const contents = await prisma.content.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Calculate stats
  const stats = {
    total: contents.length,
    human: contents.filter((c) => c.contentType === "HUMAN").length,
    ai: contents.filter((c) => c.contentType === "AI").length,
    withAi: contents.filter((c) => c.contentType === "WITH_AI").length,
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-gradient-to-br from-cyan-200 to-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Content</h1>
              <p className="text-gray-600 mt-1">
                Manage your registered content and badges
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Register New
            </Link>
          </div>

          {/* Stats Cards */}
          {contents.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
              </div>

              {/* Human */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">HI</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.human}</p>
                    <p className="text-sm text-gray-500">Human</p>
                  </div>
                </div>
              </div>

              {/* AI */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AI</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.ai}</p>
                    <p className="text-sm text-gray-500">AI Made</p>
                  </div>
                </div>
              </div>

              {/* With AI */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">+AI</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.withAi}</p>
                    <p className="text-sm text-gray-500">With AI</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {contents.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No content registered yet
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Register your first piece of content to get a declaration badge that shows how it was made.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register Your First Content
              </Link>
            </div>
          ) : (
            /* Content List */
            <div className="space-y-4">
              {contents.map((content) => {
                const config = CONTENT_TYPE_CONFIG[content.contentType];
                return (
                  <div
                    key={content.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="p-6 flex flex-col sm:flex-row gap-6">
                      {/* Badge Preview with Glow */}
                      <div className="relative flex-shrink-0 self-center sm:self-start">
                        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-xl blur-xl opacity-30 scale-90`} />
                        <Image
                          src={`/api/content/${content.id}/badge`}
                          alt="Badge"
                          width={144}
                          height={88}
                          className="relative rounded-xl"
                          unoptimized
                        />
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-xl text-gray-900 truncate">
                              {content.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color} ${config.border} border`}>
                                <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${config.gradient}`} />
                                {config.label}
                              </span>
                              <span className="text-sm text-gray-400">
                                {new Date(content.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              {content.owner && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-sm text-gray-500">
                                    Owned by{" "}
                                    {content.owner.startsWith("@") ? (
                                      <Link
                                        href={`/${content.owner.slice(1)}`}
                                        className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                                      >
                                        {content.owner}
                                      </Link>
                                    ) : (
                                      <span className="font-medium text-gray-700">{content.owner}</span>
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {content.description && (
                          <p className="text-gray-600 mt-3 line-clamp-2">
                            {content.description}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                          <Link
                            href={`/declaration/${content.id}`}
                            className={`inline-flex items-center gap-2 px-4 py-2 ${config.bg} ${config.border} border rounded-lg ${config.color} font-medium text-sm hover:opacity-80 transition-opacity`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                          <a
                            href={`/api/content/${content.id}/badge`}
                            download={`madeby-badge-${content.id}.png`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm transition-colors"
                            title="Download badge with QR code"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            QR Badge
                          </a>
                          <a
                            href={`/api/content/${content.id}/badge-simple`}
                            download={`madeby-simple-${content.id}.png`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm transition-colors"
                            title="Download simple badge"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Simple
                          </a>
                          <CopyEmbedButton
                            contentType={content.contentType}
                            verifyUrl={`${baseUrl}/declaration/${content.id}`}
                          />
                          <CopyLinkButton url={`${baseUrl}/declaration/${content.id}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Help */}
          {contents.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">
                Need help? Share your declaration links with others so they can see your content&apos;s origin.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
