"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="max-w-4xl mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-white mb-6">
          Turn Your Books Into Audiobooks
        </h1>
        <p className="text-xl text-indigo-100 mb-8">
          Upload EPUB, PDF, or TXT files and get natural-sounding audiobooks
          powered by AI. Choose from free local TTS or premium cloud voices.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/register")}
            className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Get Started Free
          </button>
          <button
            onClick={() => router.push("/login")}
            className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
          >
            Sign In
          </button>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 text-white">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">9+</div>
            <div className="text-indigo-200">Languages Supported</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">Hybrid</div>
            <div className="text-indigo-200">Local + Cloud TTS</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">M4B</div>
            <div className="text-indigo-200">Download or Stream</div>
          </div>
        </div>
      </div>
    </div>
  );
}
