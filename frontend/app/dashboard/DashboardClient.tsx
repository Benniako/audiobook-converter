"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import BookCard from "@/components/BookCard";
import ThemeToggle from "@/components/ThemeToggle";
import { BookCardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Plus, LogOut, BookOpen, Library, Eye, RefreshCw } from "lucide-react";

interface Book {
  id: string; title: string; author: string; cover_url: string | null;
  status: string; tts_provider: string; duration_seconds: number; created_at: string;
}

const DEMO_BOOKS: Book[] = [
  { id: "demo-1", title: "The Great Gatsby", author: "F. Scott Fitzgerald", cover_url: null, status: "ready", tts_provider: "kokoro", duration_seconds: 14400, created_at: new Date().toISOString() },
  { id: "demo-2", title: "Dune", author: "Frank Herbert", cover_url: null, status: "ready", tts_provider: "chatterbox", duration_seconds: 28800, created_at: new Date().toISOString() },
  { id: "demo-3", title: "Atomic Habits", author: "James Clear", cover_url: null, status: "processing", tts_provider: "kokoro", duration_seconds: 9600, created_at: new Date().toISOString() },
  { id: "demo-4", title: "The Art of War", author: "Sun Tzu", cover_url: null, status: "ready", tts_provider: "qwen3", duration_seconds: 2400, created_at: new Date().toISOString() },
  { id: "demo-5", title: "Meditations", author: "Marcus Aurelius", cover_url: null, status: "ready", tts_provider: "omnivoice", duration_seconds: 4800, created_at: new Date().toISOString() },
  { id: "demo-6", title: "The Alchemist", author: "Paulo Coelho", cover_url: null, status: "error", tts_provider: "kokoro", duration_seconds: 0, created_at: new Date().toISOString() },
];

export default function DashboardClient() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchBooks = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setBooks(DEMO_BOOKS); setIsDemo(true); setLoading(false); return; }
    try {
      const data = await api.listBooks();
      setBooks(data);
      setIsDemo(false);
    } catch {
      setBooks(DEMO_BOOKS);
      setIsDemo(true);
      toast("Running in demo mode", "info");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleLogout = () => { api.setToken(null); toast("Signed out", "info"); router.push("/"); };

  const stats = [
    { label: "Total", value: books.length, icon: Library, color: "from-indigo-500 to-violet-500" },
    { label: "Ready", value: books.filter((b) => b.status === "ready").length, icon: BookOpen, color: "from-emerald-500 to-teal-500" },
    { label: "Processing", value: books.filter((b) => b.status === "processing").length, icon: Eye, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[var(--text)]">My Library</h1>
              {isDemo && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">Demo</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => router.push("/admin")} className="btn-ghost text-sm hidden sm:flex">Admin</button>
            <ThemeToggle />
            <button onClick={() => router.push("/upload")} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span>
            </button>
            {!isDemo && <button onClick={handleLogout} className="btn-ghost p-2"><LogOut className="w-4 h-4" /></button>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {isDemo && (
          <div className="demo-banner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2 text-sm"><Eye className="w-4 h-4 flex-shrink-0" /><span><strong>Demo Mode</strong></span></div>
            <button onClick={() => router.push("/register")} className="text-amber-800 dark:text-amber-400 font-medium underline text-sm">Create account →</button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card p-3 sm:p-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text)]">{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-violet-50 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-2">Your library is empty</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">Upload your first ebook and we&apos;ll convert it to a beautiful audiobook with chapter navigation.</p>
            <button onClick={() => router.push("/upload")} className="btn-primary">Upload Your First Book</button>
          </div>
        ) : (
          <>
            {/* Error banner: show if any book failed */}
            {books.some((b) => b.status === "error") && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between animate-fade-in">
                <span className="text-sm text-red-700 dark:text-red-400">
                  Some conversions failed.{" "}
                  <button onClick={() => { toast("Retrying failed conversions...", "info"); fetchBooks(); }} className="underline font-medium inline-flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {books.map((book, i) => (
                <div key={book.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-in">
                  <BookCard {...book} />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
