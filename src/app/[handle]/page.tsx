import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";

interface IdentityPageProps {
  params: Promise<{ handle: string }>;
}

// Reserved routes that should not be treated as handles
const RESERVED_ROUTES = [
  "api",
  "auth",
  "dashboard",
  "settings",
  "declaration",
  "success",
  "verify",
  "about",
  "privacy",
  "terms",
  "admin",
  "help",
  "support",
  "contact",
  "blog",
  "docs",
  "legal",
];

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  const config: Record<string, { gradient: string; label: string }> = {
    HUMAN: { gradient: "from-cyan-400 to-cyan-600", label: "HI" },
    AI: { gradient: "from-pink-400 to-pink-600", label: "AI" },
    WITH_AI: { gradient: "from-purple-400 to-purple-600", label: "+AI" },
  };

  const { gradient, label } = config[type] || {
    gradient: "from-gray-400 to-gray-600",
    label: "?",
  };

  return (
    <div
      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white text-xs font-bold">{label}</span>
    </div>
  );
}

export default async function IdentityPage({ params }: IdentityPageProps) {
  const { handle } = await params;
  const session = await auth();

  // Check reserved routes
  if (RESERVED_ROUTES.includes(handle.toLowerCase())) {
    notFound();
  }

  const identity = await prisma.identity.findUnique({
    where: { handle: handle.toLowerCase() },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      mailingAddress: true,
      emails: true,
      phones: true,
      domains: true,
    },
  });

  if (!identity) {
    notFound();
  }

  const isOwner = session?.user?.id === identity.userId;

  // Filter by visibility - owner sees all, visitors see only public
  const visibleEmails = isOwner
    ? identity.emails
    : identity.emails.filter((e) => e.visibility === "PUBLIC");

  const visiblePhones = isOwner
    ? identity.phones
    : identity.phones.filter((p) => p.visibility === "PUBLIC");

  const visibleDomains = isOwner
    ? identity.domains
    : identity.domains.filter((d) => d.visibility === "PUBLIC");

  const visibleAddress =
    isOwner || identity.mailingAddress?.visibility === "PUBLIC"
      ? identity.mailingAddress
      : null;

  // Get user's content declarations
  const contents = await prisma.content.findMany({
    where: { userId: identity.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const hasContactInfo =
    visibleEmails.length > 0 ||
    visiblePhones.length > 0 ||
    visibleDomains.length > 0 ||
    visibleAddress;

  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-gradient-to-br from-emerald-200 to-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 h-32" />
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden">
                    {identity.avatarUrl || identity.user.image ? (
                      <Image
                        src={identity.avatarUrl || identity.user.image!}
                        alt={
                          identity.displayName ||
                          identity.user.name ||
                          "Profile"
                        }
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                          {(
                            identity.displayName ||
                            identity.user.name ||
                            "U"
                          )[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Identity type badge */}
                  <div
                    className={`absolute -bottom-2 -right-2 px-2 py-1 rounded-lg text-xs font-medium ${
                      identity.identityType === "CORPORATE"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {identity.identityType === "CORPORATE"
                      ? "Organization"
                      : "Individual"}
                  </div>
                </div>

                <div className="flex-1 pt-4 sm:pt-0">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {identity.displayName || identity.user.name || "Anonymous"}
                  </h1>
                  <p className="text-gray-500">@{identity.handle}</p>
                </div>

                {isOwner && (
                  <Link
                    href="/settings/identity"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium text-sm transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Edit Profile
                  </Link>
                )}
              </div>

              {identity.bio && (
                <p className="text-gray-700 mt-6 whitespace-pre-wrap">
                  {identity.bio}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information Card */}
          {hasContactInfo && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Contact Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Emails */}
                {visibleEmails.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Email
                    </h3>
                    <div className="space-y-2">
                      {visibleEmails.map((email) => (
                        <div key={email.id} className="flex items-center gap-2">
                          <a
                            href={`mailto:${email.email}`}
                            className="text-gray-700 hover:text-emerald-600 transition-colors"
                          >
                            {email.email}
                          </a>
                          {email.verified === "VERIFIED" && <VerifiedBadge />}
                          {isOwner && email.visibility === "PRIVATE" && (
                            <span className="text-xs text-gray-400">
                              (private)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phones */}
                {visiblePhones.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Phone
                    </h3>
                    <div className="space-y-2">
                      {visiblePhones.map((phone) => (
                        <div key={phone.id} className="flex items-center gap-2">
                          <a
                            href={`tel:${phone.phone}`}
                            className="text-gray-700 hover:text-emerald-600 transition-colors"
                          >
                            {phone.phone}
                          </a>
                          {phone.verified === "VERIFIED" && <VerifiedBadge />}
                          {isOwner && phone.visibility === "PRIVATE" && (
                            <span className="text-xs text-gray-400">
                              (private)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domains */}
                {visibleDomains.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Domains
                    </h3>
                    <div className="space-y-2">
                      {visibleDomains.map((domain) => (
                        <div
                          key={domain.id}
                          className="flex items-center gap-2"
                        >
                          <a
                            href={`https://${domain.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            {domain.domain}
                          </a>
                          {domain.verified === "VERIFIED" && <VerifiedBadge />}
                          {isOwner && domain.visibility === "PRIVATE" && (
                            <span className="text-xs text-gray-400">
                              (private)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Address */}
                {visibleAddress && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Mailing Address
                    </h3>
                    <div className="flex items-start gap-2">
                      <p className="text-gray-700">
                        {visibleAddress.street1}
                        {visibleAddress.street2 && (
                          <>
                            <br />
                            {visibleAddress.street2}
                          </>
                        )}
                        <br />
                        {visibleAddress.city}
                        {visibleAddress.state && `, ${visibleAddress.state}`}{" "}
                        {visibleAddress.postalCode}
                        <br />
                        {visibleAddress.country}
                      </p>
                      {visibleAddress.verified === "VERIFIED" && (
                        <VerifiedBadge />
                      )}
                      {isOwner && visibleAddress.visibility === "PRIVATE" && (
                        <span className="text-xs text-gray-400">(private)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Declarations */}
          {contents.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Content Declarations
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {contents.map((content) => (
                  <Link
                    key={content.id}
                    href={`/declaration/${content.id}`}
                    className="flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors"
                  >
                    <ContentTypeBadge type={content.contentType} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {content.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span>
                          {new Date(content.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                        {content.owner && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>
                              Owned by{" "}
                              <span className="font-medium text-gray-700">
                                {content.owner}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No content message */}
          {contents.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Content Declarations Yet
              </h3>
              <p className="text-gray-600">
                This creator hasn&apos;t registered any content declarations.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
