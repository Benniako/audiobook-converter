"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Sparkles, Download, Globe, Shield, ArrowRight, Moon, Sun } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[var(--text)] hidden sm:inline">Audiobook Converter</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push("/dashboard")} className="btn-ghost text-sm">Dashboard</button>
            <button onClick={() => router.push("/login")} className="btn-secondary text-sm hidden sm:inline-flex">Sign In</button>
            <button onClick={() => router.push("/register")} className="btn-primary text-sm">Get Started</button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 dark:from-indigo-950/30 via-[var(--surface-alt)] to-violet-50 dark:to-violet-950/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-gradient-to-br from-indigo-200/20 to-violet-200/20 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto relative">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200/50 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3 h-3" />
              AI-Powered TTS
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center text-[var(--text)] leading-tight mb-6">
            Turn Your Books Into{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500">Audiobooks</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] text-center max-w-2xl mx-auto mb-10 leading-relaxed px-4">
            Upload EPUB, PDF, or TXT files and get natural-sounding audiobooks
            with chapter navigation. Choose from free local TTS or premium cloud voices.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 px-4">
            <button onClick={() => router.push("/register")}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2">
              Start Free <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn-secondary px-8 py-3.5">Try Demo</button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 px-4 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-[var(--text)] mb-4">Everything you need</h2>
          <p className="text-[var(--text-secondary)] text-center mb-12 max-w-xl mx-auto">From ebook upload to finished audiobook in minutes</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Globe, title: "9+ Languages", desc: "Support for English, Spanish, French, Japanese, and more with native voices" },
              { icon: Sparkles, title: "Hybrid TTS Engine", desc: "Free local Kokoro-82M for zero-cost conversion, plus 4 premium engines" },
              { icon: Download, title: "Stream or Download", desc: "Listen in your browser or download as M4B/MP3 with chapter markers" },
              { icon: BookOpen, title: "Multiple Formats", desc: "Upload EPUB, PDF, or TXT — we parse chapters automatically" },
              { icon: Shield, title: "Custom TTS Plugins", desc: "Add your own TTS engines via the admin panel — script, CLI, or HTTP" },
              { icon: Sparkles, title: "Chapter Navigation", desc: "Jump between chapters, track progress, adjust speed from 0.5x to 2x" },
            ].map((f, i) => (
              <div key={i} className="card card-hover p-5 sm:p-6 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 dark:from-indigo-900/30 to-violet-50 dark:to-violet-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-[var(--text)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-br from-indigo-600 to-violet-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to convert your first book?</h2>
          <p className="text-indigo-200 mb-8">No credit card required. Start with free local TTS.</p>
          <button onClick={() => router.push("/register")}
            className="bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 active:scale-[0.98] transition-all inline-flex items-center gap-2 shadow-xl">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>Audiobook Converter</span>
          <a href="https://github.com/Benniako/audiobook-converter" target="_blank" className="hover:text-[var(--text-secondary)] transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
