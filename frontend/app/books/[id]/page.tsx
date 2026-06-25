"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AudioPlayer from "@/components/AudioPlayer";
import ChapterList from "@/components/ChapterList";
import ProgressBar from "@/components/ProgressBar";
import { ArrowLeft, BookOpen } from "lucide-react";

interface Chapter {
  id: string;
  index: number;
  title: string;
  audio_path: string | null;
  duration_seconds: number;
}

interface BookData {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  status: string;
  tts_provider: string;
  duration_seconds: number;
  chapters: Chapter[];
}

export default function BookPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [conversionStatus, setConversionStatus] = useState<{ status: string; progress: number } | null>(null);

  const fetchBook = useCallback(async () => {
    try {
      const data = await api.getBook(id);
      setBook(data);
      if (data.chapters.length > 0) {
        setCurrentChapterId((prev) => prev || data.chapters[0].id);
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchBook();
  }, [id, fetchBook, router]);

  // Poll conversion status if processing
  useEffect(() => {
    if (!book || book.status === "ready" || book.status === "error") return;

    const interval = setInterval(async () => {
      try {
        const status = await api.getConversionStatus(id);
        setConversionStatus(status);
        if (status.status === "done") {
          fetchBook();
          clearInterval(interval);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [book?.status, id, fetchBook]);

  const currentChapter = book?.chapters.find((c) => c.id === currentChapterId);

  const handleChapterPlay = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    setIsPlaying(true);
  };

  const handleChapterEnd = () => {
    if (currentChapterId && book) {
      setCompletedChapters((prev) => new Set(prev).add(currentChapterId));
    }
    // Auto-advance to next chapter
    if (book && currentChapterId) {
      const idx = book.chapters.findIndex((c) => c.id === currentChapterId);
      if (idx < book.chapters.length - 1) {
        setCurrentChapterId(book.chapters[idx + 1].id);
      } else {
        setIsPlaying(false);
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!book) return null;

  const audioUrl = currentChapter?.audio_path ? api.getChapterAudioUrl(book.id, currentChapter.id) : null;
  const downloadUrl = book.status === "ready" ? api.getDownloadUrl(book.id) : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{book.title}</h1>
            <p className="text-sm text-gray-500">{book.author}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Conversion progress */}
        {(book.status === "processing" || conversionStatus) && (
          <div className="mb-6">
            <ProgressBar
              progress={conversionStatus?.progress ?? 0}
              status={conversionStatus?.status ?? "queued"}
            />
          </div>
        )}

        {/* Player */}
        <div className="mb-8">
          <AudioPlayer
            audioUrl={audioUrl}
            title={currentChapter?.title || "Select a chapter"}
            onEnded={handleChapterEnd}
            downloadUrl={downloadUrl}
          />
        </div>

        {/* Chapter list */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Chapters</h2>
          {book.chapters.length > 0 ? (
            <ChapterList
              chapters={book.chapters}
              currentChapterId={currentChapterId}
              isPlaying={isPlaying}
              onPlay={handleChapterPlay}
              completedChapters={completedChapters}
            />
          ) : (
            <div className="text-center py-10 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3" />
              <p>No chapters available yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
