"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";
import AudioPlayer from "@/components/AudioPlayer";
import ChapterList from "@/components/ChapterList";
import ProgressBar from "@/components/ProgressBar";
import SleepTimer from "@/components/SleepTimer";
import ShortcutOverlay from "@/components/ShortcutOverlay";
import { useToast } from "@/components/Toast";
import {
  ArrowLeft, BookOpen, Clock, Headphones, Download, ChevronDown, Bookmark, Trash2, List
} from "lucide-react";

interface Chapter { id: string; index: number; title: string; audio_path: string | null; duration_seconds: number; }
interface BookData {
  id: string; title: string; author: string; cover_url: string | null;
  status: string; tts_provider: string; playback_speed: number;
  duration_seconds: number; chapters: Chapter[];
}

const FORMATS = [
  { id: "m4b", label: "M4B", desc: "Best for audiobooks" },
  { id: "mp3", label: "MP3", desc: "Universal" },
  { id: "flac", label: "FLAC", desc: "Lossless" },
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
  const [conversionStatus, setConversionStatus] = useState<{ status: string; progress: number; queue_position?: number } | null>(null);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("m4b");
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; chapter_id: string; position_seconds: number; note: string | null; created_at: string }>>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const chapterListRef = useRef<HTMLDivElement>(null);

  const fetchBook = useCallback(async () => {
    try {
      const data = await api.getBook(id);
      setBook(data);
      if (data.chapters.length > 0) setCurrentChapterId((prev) => prev || data.chapters[0].id);
    } catch (err: any) {
      toast(err.message || "Could not load book", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchBook(); }, [id, fetchBook]);

  useEffect(() => {
    if (!book) return;
    api.listBookmarks(book.id).then(setBookmarks).catch(() => {});
  }, [book?.id]);

  const handleAddBookmark = async () => {
    if (!book || !currentChapterId) return;
    try {
      const bm = await api.createBookmark(book.id, { chapter_id: currentChapterId, position_seconds: 0 });
      setBookmarks((prev) => [bm, ...prev]);
      toast("Bookmark added", "success");
    } catch { toast("Failed to add bookmark", "error"); }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!book) return;
    try {
      await api.deleteBookmark(book.id, bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      toast("Bookmark removed", "info");
    } catch { toast("Failed to remove bookmark", "error"); }
  };

  useEffect(() => {
    if (!book || book.status === "ready" || book.status === "error") return;
    const interval = setInterval(async () => {
      try {
        const status = await api.getConversionStatus(id);
        setConversionStatus(status);
        if (status.status === "done") { fetchBook(); clearInterval(interval); }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [book?.status, id, fetchBook]);

  useEffect(() => {
    if (!currentChapterId || !chapterListRef.current) return;
    const btn = chapterListRef.current.querySelector(`[data-chapter-id="${currentChapterId}"]`);
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentChapterId]);

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

  if (loading) return (
    <div className="min-h-screen bg-[var(--surface-alt)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
  if (!book) return null;

  const audioUrl = currentChapter?.audio_path ? api.getChapterAudioUrl(book.id, currentChapter.id) : null;
  const selectedFmt = FORMATS.find((f) => f.id === selectedFormat) || FORMATS[0];

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <Nav backTo="/dashboard" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{book.title}</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{book.author || "Unknown Author"}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SleepTimer onSleep={() => setIsPlaying(false)} />
            <ShortcutOverlay />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5"><Headphones className="w-4 h-4" />{book.chapters.length} chapters</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{Math.floor(totalDuration / 60)} min</span>
          {completedCount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">{Math.round((completedCount / book.chapters.length) * 100)}% done</span>
          )}
          {conversionStatus?.queue_position && conversionStatus.queue_position > 0 && (
            <span className="text-amber-600">#{conversionStatus.queue_position} in queue</span>
          )}
          <span className="text-[10px] text-[var(--text-muted)] ml-auto">Space: ⏯ · ← →: skip</span>
        </div>

        {/* Progress bar during conversion */}
        {(book.status === "processing" || conversionStatus) && (
          <ProgressBar
            progress={conversionStatus?.progress ?? 0}
            status={conversionStatus?.status ?? "queued"}
          />
        )}

        {/* Audio Player */}
        <div className="card p-5">
          <AudioPlayer
            audioUrl={audioUrl}
            title={currentChapter?.title || "Select a chapter"}
            playing={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onEnded={handleChapterEnd}
          />

          {/* Player controls bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <button onClick={handleAddBookmark} className="btn-ghost text-xs flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" /> Bookmark
              </button>
              {bookmarks.length > 0 && (
                <button onClick={() => setShowBookmarks(!showBookmarks)} className="btn-ghost text-xs">
                  {showBookmarks ? "Hide" : "Show"} ({bookmarks.length})
                </button>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setShowFormatPicker(!showFormatPicker)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{selectedFmt.label}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showFormatPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFormatPicker(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[150px]">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFormat(f.id); setShowFormatPicker(false); toast(`Downloading ${f.label}...`, "info"); }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedFormat === f.id ? "text-indigo-600 font-medium" : "text-[var(--text-secondary)]"}`}
                      >
                        <span className="font-medium">{f.label}</span> <span className="text-xs">— {f.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bookmarks */}
        {showBookmarks && bookmarks.length > 0 && (
          <div className="card p-4 space-y-2 animate-fadeIn">
            <h3 className="text-sm font-semibold text-[var(--text)]">Bookmarks</h3>
            {bookmarks.map((bm) => {
              const ch = book.chapters.find((c) => c.id === bm.chapter_id);
              return (
                <div key={bm.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-[var(--text-secondary)]">{ch?.title || "Unknown chapter"}</span>
                  <button onClick={() => handleDeleteBookmark(bm.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Chapter list */}
        <div ref={chapterListRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <List className="w-4 h-4 text-[var(--primary)]" /> Chapters
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{completedCount}/{book.chapters.length} listened</span>
          </div>
          {book.chapters.length > 0 ? (
            <ChapterList
              chapters={book.chapters}
              currentChapterId={currentChapterId}
              isPlaying={isPlaying}
              onPlay={handleChapterPlay}
              completedChapters={completedChapters}
              onReorder={(ids) => {
                api.reorderChapters(book.id, ids)
                  .then(() => { toast("Chapters reordered", "success"); fetchBook(); })
                  .catch(() => toast("Reorder failed", "error"));
              }}
            />
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
