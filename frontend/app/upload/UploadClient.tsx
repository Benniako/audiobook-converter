"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UploadZone from "@/components/UploadZone";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { ArrowLeft, BookOpen, FileText, File, Info, Sparkles, Cpu, Globe, Zap, ChevronDown } from "lucide-react";

const PROVIDERS = [
  { id: "kokoro", name: "Kokoro-82M", quality: "Good (8/10)", languages: "8", hardware: "CPU/Any GPU", license: "Apache-2.0", tier: "free", desc: "Lightweight, runs anywhere", icon: Zap, color: "from-indigo-500 to-purple-600" },
  { id: "chatterbox", name: "Chatterbox Turbo", quality: "Excellent (9/10)", languages: "23", hardware: "GPU 4GB+", license: "MIT", tier: "pro", desc: "SOTA quality, voice cloning", icon: Sparkles, color: "from-emerald-500 to-teal-600" },
  { id: "qwen3", name: "Qwen3-TTS 1.7B", quality: "Excellent (9/10)", languages: "10", hardware: "GPU 4-8GB", license: "Apache-2.0", tier: "pro", desc: "97ms latency, instruction control", icon: Cpu, color: "from-violet-500 to-fuchsia-600" },
  { id: "omnivoice", name: "OmniVoice", quality: "Very Good (8/10)", languages: "600+", hardware: "GPU (CUDA/MPS)", license: "Apache-2.0", tier: "pro", desc: "600+ languages, 40x speed", icon: Globe, color: "from-blue-500 to-cyan-600" },
  { id: "cosyvoice", name: "CosyVoice 300M", quality: "Excellent (9/10)", languages: "10", hardware: "GPU 8GB+", license: "Apache-2.0", tier: "pro", desc: "Instruction-controlled, 150ms", icon: Sparkles, color: "from-rose-500 to-pink-600" },
  { id: "openai", name: "OpenAI TTS", quality: "Very Good (8/10)", languages: "6", hardware: "Cloud API", license: "Proprietary", tier: "pro", desc: "Cloud-based, requires key", icon: Globe, color: "from-orange-500 to-red-600" },
];

export default function UploadClient() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("kokoro");
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Sign in required."); setIsDemo(true); return; }
    setUploading(true); setError("");
    try {
      const book = await api.uploadBook(file);
      await api.startConversion(book.id, selectedProvider);
      toast(`Converting with ${PROVIDERS.find((p) => p.id === selectedProvider)?.name}`, "success");
      router.push(`/books/${book.id}`);
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); }
  };

  const selected = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="font-bold text-[var(--text)]">Upload a Book</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {isDemo && (
          <div className="demo-banner flex flex-col sm:flex-row items-start sm:items-center gap-2 animate-fade-in">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">Upload requires an account. <button onClick={() => router.push("/register")} className="underline font-medium">Sign up</button> or <button onClick={() => router.push("/login")} className="underline font-medium">sign in</button>.</span>
          </div>
        )}
        {error && !isDemo && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl">{error}</div>}

        <UploadZone onUpload={handleUpload} uploading={uploading} />

        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><Sparkles className="w-4 h-4 text-[var(--primary)]" />TTS Engine</h2>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selected.tier === "free" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}>
              {selected.tier === "free" ? "Free" : "Premium"}
            </span>
          </div>

          <button onClick={() => setShowProviderPicker(!showProviderPicker)}
            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-gray-50 dark:from-gray-800/50 to-[var(--surface)] border border-[var(--border)] hover:border-indigo-200 dark:hover:border-indigo-700 transition-all text-left">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center flex-shrink-0`}>
              <selected.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text)] text-sm sm:text-base">{selected.name}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{selected.desc}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform ${showProviderPicker ? "rotate-180" : ""}`} />
          </button>

          {showProviderPicker && (
            <div className="mt-2 space-y-1 animate-fade-in">
              {PROVIDERS.filter((p) => p.id !== selectedProvider).map((p) => (
                <button key={p.id} onClick={() => { setSelectedProvider(p.id); setShowProviderPicker(false); }}
                  className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent hover:border-[var(--border)] transition-all text-left">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}><p.icon className="w-4 h-4 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-[var(--text)]">{p.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.tier === "free" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600"}`}>{p.tier === "free" ? "Free" : "Pro"}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                  </div>
                  <div className="text-right text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block"><div>{p.quality}</div><div>{p.hardware}</div></div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{selected.quality}</span>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{selected.languages}</span>
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{selected.hardware}</span>
            <span>{selected.license}</span>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="section-title mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-[var(--primary)]" />Supported Formats</h2>
          <div className="grid gap-3">
            {[
              { icon: BookOpen, name: "EPUB", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30", desc: "Standard ebook format" },
              { icon: FileText, name: "PDF", color: "text-red-600 bg-red-50 dark:bg-red-900/30", desc: "Heading analysis" },
              { icon: File, name: "TXT", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30", desc: "Auto chapter splitting" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                <div className={`w-9 h-9 rounded-xl ${f.color} flex items-center justify-center`}><f.icon className="w-4 h-4" /></div>
                <div><p className="font-medium text-sm text-[var(--text)]">{f.name}</p><p className="text-xs text-[var(--text-secondary)]">{f.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
