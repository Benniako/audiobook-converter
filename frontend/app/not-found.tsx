"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 dark:from-indigo-900/30 to-violet-100 dark:to-violet-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">404</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">Page not found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">This chapter doesn&apos;t exist in this book.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
