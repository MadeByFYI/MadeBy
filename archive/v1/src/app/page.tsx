import { RegistrationForm } from "@/components/RegistrationForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await auth();

  // Fetch the user's identity to get their display name if logged in
  let defaultCreatorName = "";
  if (session?.user?.id) {
    const identity = await prisma.identity.findUnique({
      where: { userId: session.user.id },
      select: { displayName: true },
    });
    defaultCreatorName = identity?.displayName || session.user.name || "";
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Hero Text */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm mb-6 backdrop-blur-sm">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Make Your Declaration
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Let The World Know{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                  How The Work Got Done
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg">
                A simple badge that tells the world how you made it:
                with HI (human intelligence), AI, or a mix of both.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start relative z-10">
                <a
                  href="#register"
                  className="block px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg text-center"
                >
                  Register Your Content
                </a>
              </div>
            </div>

            {/* Badge Previews */}
            <div className="relative h-80 md:h-96 flex flex-col justify-center gap-4">
              {/* Human Badge */}
              <div className="float-animation">
                <div className="w-44 md:w-48 rounded-xl bg-cyan-50 border-2 border-cyan-500 shadow-xl shadow-cyan-500/20 p-2.5">
                  {/* Top row labels */}
                  <div className="flex mb-2">
                    <span className="flex-1 text-center text-[10px] md:text-xs font-bold text-cyan-700">MADE BY</span>
                    <span className="flex-1 text-center text-[10px] md:text-xs font-bold text-cyan-700">SCAN</span>
                  </div>
                  {/* Bottom row: Letters + QR */}
                  <div className="flex gap-2">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center flex-1">
                      <span className="text-white text-2xl md:text-3xl font-black">HI</span>
                    </div>
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-lg bg-white border border-cyan-200 flex items-center justify-center flex-1">
                      <svg className="w-10 h-10 md:w-12 md:h-12 text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11 0h3v3h-3v-3zm-2-2h2v2h-2v-2zm2 5h2v2h-2v-2zm3-3h2v2h-2v-2zm0 3h2v2h-2v-2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Badge */}
              <div className="float-animation-delayed self-end">
                <div className="w-44 md:w-48 rounded-xl bg-pink-50 border-2 border-pink-500 shadow-xl shadow-pink-500/20 p-2.5">
                  {/* Top row labels */}
                  <div className="flex mb-2">
                    <span className="flex-1 text-center text-[10px] md:text-xs font-bold text-pink-700">MADE BY</span>
                    <span className="flex-1 text-center text-[10px] md:text-xs font-bold text-pink-700">SCAN</span>
                  </div>
                  {/* Bottom row: Letters + QR */}
                  <div className="flex gap-2">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-1">
                      <span className="text-white text-2xl md:text-3xl font-black">AI</span>
                    </div>
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-lg bg-white border border-pink-200 flex items-center justify-center flex-1">
                      <svg className="w-10 h-10 md:w-12 md:h-12 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11 0h3v3h-3v-3zm-2-2h2v2h-2v-2zm2 5h2v2h-2v-2zm3-3h2v2h-2v-2zm0 3h2v2h-2v-2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* With AI Badge */}
              <div className="float-animation-delayed-2">
                <div className="w-44 md:w-48 rounded-xl bg-purple-50 border-2 border-purple-500 shadow-xl shadow-purple-500/20 p-2.5">
                  {/* Top row labels */}
                  <div className="flex mb-2">
                    <span className="flex-1 text-center text-[10px] md:text-xs font-bold text-purple-700">MADE WITH</span>
                    <span className="flex-1 text-center text-[10px] md:text-xs font-bold text-purple-700">SCAN</span>
                  </div>
                  {/* Bottom row: Letters + QR */}
                  <div className="flex gap-2">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-1 relative">
                      <span className="absolute top-[18%] left-[12%] text-white/90 text-[10px] md:text-xs font-bold">w/</span>
                      <span className="text-white text-2xl md:text-3xl font-black">AI</span>
                    </div>
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-lg bg-white border border-purple-200 flex items-center justify-center flex-1">
                      <svg className="w-10 h-10 md:w-12 md:h-12 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11 0h3v3h-3v-3zm-2-2h2v2h-2v-2zm2 5h2v2h-2v-2zm3-3h2v2h-2v-2zm0 3h2v2h-2v-2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#fafafa"/>
          </svg>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-[#fafafa]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Three simple steps to get your badge
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Register",
                description: "Fill out the form with your content details and select the appropriate attribution type.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Get Your Badge",
                description: "Receive a unique badge with an embedded QR code linking to your declaration.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Share",
                description: "Display your badge with your content. Anyone can scan the QR to see your declaration.",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow group"
              >
                <div className="absolute -top-4 left-8 px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-full">
                  {item.step}
                </div>
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form Section */}
      <section id="register" className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Register Your Content
            </h2>
            <p className="text-gray-600">
              Fill out the form below to get your badge
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <RegistrationForm defaultCreatorName={defaultCreatorName} />
          </div>
        </div>
      </section>
    </main>
  );
}
