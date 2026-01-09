"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <span className="text-white text-sm font-black">M</span>
          </div>
          <span className="text-xl font-bold text-gray-900">MadeBy.fyi</span>
        </Link>

        <nav className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="w-20 h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : session ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/settings/identity"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Identity
              </Link>
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-gray-700"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="px-5 py-2 text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 rounded-lg transition-all font-medium shadow-sm hover:shadow-md"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
