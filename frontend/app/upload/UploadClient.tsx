"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";
import UploadZone from "@/components/UploadZone";
import VoiceSelector from "@/components/VoiceSelector";
import { useToast } from "@/components/Toast";
import {
  ArrowLeft, Sparkles, Cpu, Globe, ChevronDown, Languages, Play, Check, Info, BookOpen, FileText, File, Mic
} from "lucide-react";

interface Lang {
  code: string; name: string; flag: string;
}

const PROVIDERS = [
  { id: "kokoro", name: "Kokoro-82M", quality: "Good (7/10)", langs: 10, hardware: "CPU", license: "Apache-2.0", tier: "free", icon: Sparkles, color: "from-emerald-500 to-teal-500", desc: "Fast CPU, no GPU needed" },
  { id: "chatterbox", name: "Chatterbox", quality: "Good (7/10)", langs: 31, hardware: "CPU", license: "Apache-2.0", tier: "free", icon: Cpu, color: "from-sky-500 to-blue-600", desc: "Multi-language, local" },
  { id: "vox_clone", name: "Vox Clone (XTTS)", quality: "Excellent (9/10)", langs: 17, hardware: "GPU 4GB+", license: "CPML", tier: "pro", icon: Mic, color: "from-purple-500 to-pink-600", desc: "Clone any voice from samples" },
  { id: "openai", name: "OpenAI TTS", quality: "Very Good (8/10)", langs: 6, hardware: "Cloud API", license: "Proprietary", tier: "pro", icon: Globe, color: "from-green-500 to-emerald-600", desc: "Cloud, needs API key" },
];

function LangPicker({ value, onChange, open, setOpen, label, languages }: {
  value: string; onChange: (v: string) => void; open: boolean; setOpen: (v: boolean) => void;
  label: string; languages: Lang[];
}) {
  const selected = languages.find((l) => l.code === value);
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] hover:border-indigo-400 transition-colors"
      >
        <Globe className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="flex-1 text-left">{selected ? `${selected.flag} ${selected.name}` : value}</span>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { onChange(l.code); setOpen(false); }}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${value === l.code ? "text-indigo-600 font-medium" : "text-[var(--text-secondary)]"}`}
              >{l.flag} {l.name}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function UploadClient() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("kokoro");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectingLang, setDetectingLang] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [srcLang, setSrcLang] = useState("en");
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [tgtLang, setTgtLang] = useState("es");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [showSrcPicker, setShowSrcPicker] = useState(false);
  const [showTgtPicker, setShowTgtPicker] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    api.getLanguages().then(setLanguages).catch(() => {});
  }, []);

  useEffect(() => { setSelectedVoiceId(null); }, [selectedProvider]);

  const handleUpload = async (file: File) => {
    setUploading(true); setError("");
    try {
      const book = await api.uploadBook(file);
      await api.startConversion(book.id, selectedProvider, srcLang, enableTranslation ? tgtLang : undefined, selectedVoiceId || undefined);
      const p = PROVIDERS.find((p) => p.id === selectedProvider);
      toast(`Converting with ${p?.name}${enableTranslation ? ` (${srcLang}→${tgtLang})` : ""}${selectedVoiceId ? " + cloned voice" : ""}`, "success");
      router.push(`/books/${book.id}`);
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); }
  };

  const selected = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <Nav title="Upload a Book" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-4 rounded-xl flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Upload zone */}
        <UploadZone onUpload={handleUpload} uploading={uploading} onFileSelect={setSelectedFile} multiple={false} />

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Language */}
          <div className="card p-5 space-y-4">
            <h2 className="section-title flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--primary)]" />
              Language
            </h2>
            <LangPicker value={srcLang} onChange={setSrcLang} open={showSrcPicker} setOpen={setShowSrcPicker} label="Book Language" languages={languages} />
            <button
              onClick={async () => {
                if (!selectedFile) { toast("Select a file first", "warning"); return; }
                setDetectingLang(true);
                try {
                  const text = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result?.toString().slice(0, 1000) || "");
                    reader.readAsText(selectedFile.slice(0, 2048));
                  });
                  if (text.length < 10) { toast("Could not read file content", "error"); return; }
                  const result = await api.detectLanguage(text);
                  const matched = languages.find((l) => l.code === result.language);
                  if (matched) { setSrcLang(matched.code); toast(`Detected: ${matched.flag} ${matched.name}`, "success"); }
                  else { toast(`Detected: ${result.language}`, "info"); }
                } catch { toast("Detection failed", "error"); }
                finally { setDetectingLang(false); }
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors underline flex items-center gap-1"
            >
              {detectingLang ? <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Detecting...</> : "Detect automatically"}
            </button>

            {/* Translation toggle */}
            <div className="pt-2">
              <button
                onClick={() => setEnableTranslation(!enableTranslation)}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-sm ${
                  enableTranslation
                    ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                    : "border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                <Languages className="w-4 h-4" />
                <span className="flex-1 text-left">Translate to another language</span>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  enableTranslation ? "bg-indigo-600 border-indigo-600" : "border-[var(--border)]"
                }`}>
                  {enableTranslation && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
              {enableTranslation && (
                <div className="mt-3 animate-fadeIn">
                  <LangPicker value={tgtLang} onChange={setTgtLang} open={showTgtPicker} setOpen={setShowTgtPicker} label="Target Language" languages={languages} />
                </div>
              )}
            </div>
          </div>

          {/* TTS Provider */}
          <div className="card p-5 space-y-4">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              TTS Engine
            </h2>

            <div className="relative">
              <button
                onClick={() => setShowProviderPicker(!showProviderPicker)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-gray-50 dark:from-gray-800/50 to-transparent border border-[var(--border)] hover:border-indigo-400 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <selected.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[var(--text)]">{selected.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      selected.tier === "free"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-600"
                    }`}>{selected.tier === "free" ? "Free" : "Pro"}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{selected.desc}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showProviderPicker ? "rotate-180" : ""}`} />
              </button>

              {showProviderPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProviderPicker(false)} />
                  <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-2 space-y-0.5">
                    {PROVIDERS.filter((p) => p.id !== selectedProvider).map((p) => (
                      <div key={p.id} className="flex items-center gap-1 px-1.5 group">
                        <button
                          onClick={() => { setSelectedProvider(p.id); setShowProviderPicker(false); }}
                          className="flex-1 flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-left"
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                            <p.icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-[var(--text)]">{p.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                p.tier === "free"
                                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-600"
                              }`}>{p.tier === "free" ? "Free" : "Pro"}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                          </div>
                          <div className="text-right text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">
                            <div>{p.quality}</div>
                            <div>{p.hardware}</div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            const audio = new Audio(api.getTtsPreviewUrl(p.id));
                            audio.play().catch(() => {});
                          }}
                          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-[var(--text-muted)] hover:text-[var(--primary)]"
                          title={`Preview ${p.name}`}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Provider specs */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{selected.quality}</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{selected.langs} langs</span>
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{selected.hardware}</span>
              <span>{selected.license}</span>
            </div>

            {/* Voice Selector for Vox Clone */}
            {selectedProvider === "vox_clone" && (
              <div className="pt-2 border-t border-[var(--border)] animate-fadeIn">
                <VoiceSelector selectedProfileId={selectedVoiceId} onSelect={setSelectedVoiceId} />
              </div>
            )}
          </div>
        </div>

        {/* Formats */}
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-[var(--primary)]" />
            Supported Formats
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: BookOpen, name: "EPUB", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30", desc: "Standard ebook format" },
              { icon: FileText, name: "PDF", color: "text-red-600 bg-red-50 dark:bg-red-900/30", desc: "Heading analysis" },
              { icon: File, name: "TXT", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30", desc: "Auto chapter splitting" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                <div className={`w-9 h-9 rounded-xl ${f.color} flex items-center justify-center flex-shrink-0`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--text)]">{f.name}</p>
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
