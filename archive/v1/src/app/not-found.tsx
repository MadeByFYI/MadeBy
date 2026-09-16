"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-emerald-200 to-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-25 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-100 to-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none" />

      <div className="relative text-center max-w-lg mx-auto">
        {/* 404 Display */}
        <div className="relative mb-8">
          {/* Glowing background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full blur-3xl opacity-20" />
          </div>

          {/* Number */}
          <h1 className="relative text-[150px] sm:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-emerald-800 leading-none select-none">
            404
          </h1>
        </div>

        {/* Icon */}
        <div className="inline-flex mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
          <button
            onClick={() => history.back()}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Or try one of these:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
            >
              Register Content
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/dashboard"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/auth/signin"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
