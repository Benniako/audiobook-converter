"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UploadZone from "@/components/UploadZone";
import { ArrowLeft, BookOpen, FileText, File, Info, Sparkles, Cpu, Globe, Zap, ChevronDown } from "lucide-react";

const PROVIDERS = [
  {
    id: "kokoro",
    name: "Kokoro-82M",
    quality: "Good (8/10)",
    languages: "8 languages",
    hardware: "CPU / Any GPU",
    license: "Apache-2.0",
    tier: "free",
    desc: "Lightweight model that runs on any hardware. Best free option.",
    icon: Zap,
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "chatterbox",
    name: "Chatterbox Turbo",
    quality: "Excellent (9/10)",
    languages: "23 languages",
    hardware: "GPU 4GB+",
    license: "MIT",
    tier: "pro",
    desc: "SOTA quality with zero-shot voice cloning. Best overall pick.",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "qwen3",
    name: "Qwen3-TTS 1.7B",
    quality: "Excellent (9/10)",
    languages: "10 languages",
    hardware: "GPU 4-8GB",
    license: "Apache-2.0",
    tier: "pro",
    desc: "97ms latency with voice cloning and instruction control. By Alibaba.",
    icon: Cpu,
    color: "from-violet-500 to-fuchsia-600",
  },
  {
    id: "omnivoice",
    name: "OmniVoice",
    quality: "Very Good (8/10)",
    languages: "600+ languages",
    hardware: "GPU (CUDA/MPS)",
    license: "Apache-2.0",
    tier: "pro",
    desc: "600+ language support. 40x real-time inference speed.",
    icon: Globe,
    color: "from-blue-500 to-cyan-600",
  },
  {
    id: "cosyvoice",
    name: "CosyVoice 300M",
    quality: "Excellent (9/10)",
    languages: "10 languages",
    hardware: "GPU 8GB+",
    license: "Apache-2.0",
    tier: "pro",
    desc: "Instruction-controlled TTS with 150ms streaming.",
    icon: Sparkles,
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "openai",
    name: "OpenAI TTS",
    quality: "Very Good (8/10)",
    languages: "6 languages",
    hardware: "Cloud API",
    license: "Proprietary",
    tier: "pro",
    desc: "Cloud-based TTS. Requires API key and internet connection.",
    icon: Globe,
    color: "from-orange-500 to-red-600",
  },
];

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("kokoro");
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const router = useRouter();

  const handleUpload = async (file: File) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Sign in required to upload books.");
      setIsDemo(true);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const book = await api.uploadBook(file);
      await api.startConversion(book.id, selectedProvider);
      router.push(`/books/${book.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const selected = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-white border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900">Upload a Book</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isDemo && (
          <div className="demo-banner flex items-start gap-2 animate-fade-in">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Demo Mode</strong> — Create an account to upload real files.
              <button onClick={() => router.push("/register")} className="ml-1 underline font-medium">Sign up</button>
              {" "}or{" "}
              <button onClick={() => router.push("/login")} className="underline font-medium">sign in</button>.
            </div>
          </div>
        )}

        {error && !isDemo && (
          <div className="bg-red-50 border border-red-200/50 text-red-600 text-sm p-4 rounded-xl">{error}</div>
        )}

        {/* Upload zone */}
        <UploadZone onUpload={handleUpload} uploading={uploading} />

        {/* TTS Provider Selection */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              TTS Engine
            </h2>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              selected.tier === "free" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}>
              {selected.tier === "free" ? "Free" : "Premium"}
            </span>
          </div>

          {/* Selected provider card */}
          <button
            onClick={() => setShowProviderPicker(!showProviderPicker)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-indigo-200 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center flex-shrink-0`}>
              <selected.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{selected.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{selected.desc}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showProviderPicker ? "rotate-180" : ""}`} />
          </button>

          {/* Provider picker dropdown */}
          {showProviderPicker && (
            <div className="mt-2 space-y-1 animate-fade-in">
              {PROVIDERS.filter((p) => p.id !== selectedProvider).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProvider(p.id); setShowProviderPicker(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all text-left"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                    <p.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900">{p.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        p.tier === "free" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        {p.tier === "free" ? "Free" : "Premium"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                  </div>
                  <div className="text-right text-[10px] text-[var(--text-muted)] leading-tight">
                    <div>{p.quality}</div>
                    <div>{p.hardware}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Provider details */}
          <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {selected.quality}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" /> {selected.languages}
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3" /> {selected.hardware}
            </span>
            <span className="flex items-center gap-1">
              {selected.license}
            </span>
          </div>
        </div>

        {/* Format info */}
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--primary)]" />
            Supported Formats
          </h2>
          <div className="grid gap-3">
            {[
              { icon: BookOpen, name: "EPUB", color: "text-indigo-600 bg-indigo-50", desc: "Standard ebook format with chapter metadata" },
              { icon: FileText, name: "PDF", color: "text-red-600 bg-red-50", desc: "Chapter detection via heading analysis" },
              { icon: File, name: "TXT", color: "text-amber-600 bg-amber-50", desc: "Plain text with automatic chapter splitting" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className={`w-9 h-9 rounded-xl ${f.color} flex items-center justify-center`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">{f.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
