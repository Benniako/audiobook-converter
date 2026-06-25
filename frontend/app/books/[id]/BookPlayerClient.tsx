"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AudioPlayer from "@/components/AudioPlayer";
import ChapterList from "@/components/ChapterList";
import ProgressBar from "@/components/ProgressBar";
import { useToast } from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft, BookOpen, Clock, Headphones, Info, Download, ChevronDown } from "lucide-react";

interface Chapter { id: string; index: number; title: string; audio_path: string | null; duration_seconds: number; }
interface BookData {
  id: string; title: string; author: string; cover_url: string | null;
  status: string; tts_provider: string; duration_seconds: number; chapters: Chapter[];
}

const DEMO_BOOK: BookData = {
  id: "demo-1", title: "The Great Gatsby", author: "F. Scott Fitzgerald",
  cover_url: null, status: "ready", tts_provider: "chatterbox", duration_seconds: 14400,
  chapters: [
    { id: "ch-1", index: 0, title: "Chapter 1: The Eye of the Needle", audio_path: null, duration_seconds: 720 },
    { id: "ch-2", index: 1, title: "Chapter 2: The Valley of Ashes", audio_path: null, duration_seconds: 840 },
    { id: "ch-3", index: 2, title: "Chapter 3: The Great Gatsby's Party", audio_path: null, duration_seconds: 960 },
    { id: "ch-4", index: 3, title: "Chapter 4: The Past", audio_path: null, duration_seconds: 600 },
    { id: "ch-5", index: 4, title: "Chapter 5: The Meeting", audio_path: null, duration_seconds: 1080 },
    { id: "ch-6", index: 5, title: "Chapter 6: The Truth", audio_path: null, duration_seconds: 780 },
    { id: "ch-7", index: 6, title: "Chapter 7: The Confrontation", audio_path: null, duration_seconds: 900 },
    { id: "ch-8", index: 7, title: "Chapter 8: The Aftermath", audio_path: null, duration_seconds: 660 },
    { id: "ch-9", index: 8, title: "Chapter 9: The Green Light", audio_path: null, duration_seconds: 540 },
    { id: "ch-10", index: 9, title: "Chapter 10: The Fall", audio_path: null, duration_seconds: 720 },
    { id: "ch-11", index: 10, title: "Chapter 11: The Garden", audio_path: null, duration_seconds: 480 },
    { id: "ch-12", index: 11, title: "Chapter 12: The Daisy", audio_path: null, duration_seconds: 840 },
  ],
};

const FORMATS = [
  { id: "m4b", label: "M4B", desc: "Best for audiobooks with chapters" },
  { id: "mp3", label: "MP3", desc: "Universal compatibility" },
  { id: "flac", label: "FLAC", desc: "Lossless quality" },
  { id: "opus", label: "OPUS", desc: "Best compression" },
];

export default function BookPlayerClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [conversionStatus, setConversionStatus] = useState<{ status: string; progress: number } | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("m4b");
  const chapterListRef = useRef<HTMLDivElement>(null);

  const fetchBook = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setBook(DEMO_BOOK); setCurrentChapterId(DEMO_BOOK.chapters[0].id); setIsDemo(true); setLoading(false); return; }
    try {
      const data = await api.getBook(id);
      setBook(data);
      if (data.chapters.length > 0) setCurrentChapterId((prev) => prev || data.chapters[0].id);
    } catch { setBook(DEMO_BOOK); setCurrentChapterId(DEMO_BOOK.chapters[0].id); setIsDemo(true); toast("Running in demo mode", "info"); }
    finally { setLoading(false); }
  }, [id, toast]);

  useEffect(() => { fetchBook(); }, [id, fetchBook]);
  useEffect(() => {
    if (!book || book.status === "ready" || book.status === "error" || isDemo) return;
    const interval = setInterval(async () => {
      try { const status = await api.getConversionStatus(id); setConversionStatus(status); if (status.status === "done") { fetchBook(); clearInterval(interval); } } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [book?.status, id, fetchBook, isDemo]);

  // Smooth scroll to current chapter
  useEffect(() => {
    if (!currentChapterId || !chapterListRef.current) return;
    const btn = chapterListRef.current.querySelector(`[data-chapter-id="${currentChapterId}"]`);
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentChapterId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); setIsPlaying((p) => !p); }
      if (e.code === "ArrowRight" && book && currentChapterId) {
        const idx = book.chapters.findIndex((c) => c.id === currentChapterId);
        if (idx < book.chapters.length - 1) setCurrentChapterId(book.chapters[idx + 1].id);
      }
      if (e.code === "ArrowLeft" && book && currentChapterId) {
        const idx = book.chapters.findIndex((c) => c.id === currentChapterId);
        if (idx > 0) setCurrentChapterId(book.chapters[idx - 1].id);
      }
      if (e.code === "KeyM" && book) { toast("Speed: " + "?", "info"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [book, currentChapterId, toast]);

  const currentChapter = book?.chapters.find((c) => c.id === currentChapterId);
  const handleChapterPlay = (chapterId: string) => { setCurrentChapterId(chapterId); setIsPlaying(true); };
  const handleChapterEnd = () => {
    if (currentChapterId && book) setCompletedChapters((prev) => new Set(prev).add(currentChapterId));
    if (book && currentChapterId) {
      const idx = book.chapters.findIndex((c) => c.id === currentChapterId);
      if (idx < book.chapters.length - 1) { setCurrentChapterId(book.chapters[idx + 1].id); } else setIsPlaying(false);
    }
  };

  const totalDuration = book?.chapters.reduce((sum, ch) => sum + ch.duration_seconds, 0) || 0;
  const completedCount = completedChapters.size;
  const selectedFmt = FORMATS.find((f) => f.id === selectedFormat) || FORMATS[0];

  const handleDownload = () => {
    if (isDemo) { toast("Sign in to download audiobooks", "info"); return; }
    toast(`Downloading ${selectedFmt.label}...`, "info");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
  if (!book) return null;

  const audioUrl = currentChapter?.audio_path ? api.getChapterAudioUrl(book.id, currentChapter.id) : null;
  const downloadUrl = book.status === "ready" && !isDemo ? api.getDownloadUrl(book.id) : undefined;

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2 flex-shrink-0"><ArrowLeft className="w-5 h-5" /></button>
            <div className="min-w-0">
              <h1 className="font-bold text-[var(--text)] truncate">{book.title}</h1>
              <p className="text-xs text-[var(--text-muted)] truncate">{book.author}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isPlaying && <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Playing</span>}
            <ThemeToggle />
            {book.status === "ready" && !isDemo && (
              <div className="relative">
                <button onClick={() => setShowFormatPicker(!showFormatPicker)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{selectedFmt.label}</span> <ChevronDown className="w-3 h-3" />
                </button>
                {showFormatPicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFormatPicker(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
                      {FORMATS.map((f) => (
                        <button key={f.id} onClick={() => { setSelectedFormat(f.id); setShowFormatPicker(false); handleDownload(); }}
                          className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedFormat === f.id ? "text-indigo-600 font-medium" : "text-[var(--text-secondary)]"}`}>
                          <span className="font-medium">{f.label}</span> — <span className="text-xs">{f.desc}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {isDemo && (
          <div className="demo-banner flex flex-col sm:flex-row items-start sm:items-center gap-2 animate-fade-in">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">Sample preview. <button onClick={() => router.push("/register")} className="underline font-medium">Create account</button> to convert real ebooks.</span>
          </div>
        )}

        {(book.status === "processing" || conversionStatus) && !isDemo && (
          <ProgressBar progress={conversionStatus?.progress ?? 0} status={conversionStatus?.status ?? "queued"} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5"><Headphones className="w-4 h-4" /><span>{book.chapters.length} chapters</span></div>
          <span className="hidden sm:inline text-[var(--border)]">|</span>
          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{Math.floor(totalDuration / 60)} min</span></div>
          {completedCount > 0 && <><span className="hidden sm:inline text-[var(--border)]">|</span><span className="text-emerald-600 dark:text-emerald-400">{Math.round((completedCount / book.chapters.length) * 100)}% done</span></>}
          <span className="hidden sm:inline text-[var(--border)]">|</span>
          <span className="text-[10px] text-[var(--text-muted)]">Space: ⏯ · ← →: skip</span>
        </div>

        <AudioPlayer audioUrl={audioUrl} title={currentChapter?.title || "Select a chapter"} playing={isPlaying} onTogglePlay={() => setIsPlaying((p) => !p)} onEnded={handleChapterEnd} downloadUrl={downloadUrl} />

        <div ref={chapterListRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2"><BookOpen className="w-4 h-4 text-[var(--primary)]" />Chapters</h2>
            <span className="text-xs text-[var(--text-muted)]">{completedCount}/{book.chapters.length} listened</span>
          </div>
          {book.chapters.length > 0 ? (
            <ChapterList chapters={book.chapters} currentChapterId={currentChapterId} isPlaying={isPlaying} onPlay={handleChapterPlay} completedChapters={completedChapters} />
          ) : (
            <div className="card p-12 text-center">
              <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] font-medium">No chapters yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
