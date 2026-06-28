"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";
import BookCard from "@/components/BookCard";
import { BookCardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import WelcomeTour from "@/components/WelcomeTour";
import {
  Plus, BookOpen, Library, Headphones, Clock, RefreshCw, Upload
} from "lucide-react";

interface Book {
  id: string; title: string; author: string; cover_url: string | null;
  status: string; tts_provider: string; duration_seconds: number; created_at: string;
}

export default function DashboardClient() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchBooks = useCallback(async () => {
    try {
      const data = await api.listBooks();
      setBooks(data);
    } catch (err: any) {
      toast(err.message || "Could not load books", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const stats = [
    {
      label: "Total Books", value: books.length, icon: Library,
      gradient: "from-indigo-500 to-violet-500",
      lightBg: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      label: "Ready to Listen", value: books.filter((b) => b.status === "ready").length, icon: Headphones,
      gradient: "from-emerald-500 to-teal-500",
      lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Processing", value: books.filter((b) => b.status === "processing" || b.status === "uploading").length, icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      lightBg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  const hasErrors = books.some((b) => b.status === "error");

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <WelcomeTour />
      <Nav title="My Library" actions={
        <button
          onClick={() => router.push("/upload")}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Book</span>
        </button>
      } />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {stats.map((s, i) => (
            <div
              key={i}
              className="card p-4 sm:p-5 fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums">{s.value}</p>
                  <p className="text-xs text-[var(--text-muted)] leading-tight">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error banner */}
        {hasErrors && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
            <span className="text-sm text-red-700 dark:text-red-400">
              Some conversions failed.{" "}
              <button
                onClick={() => { toast("Retrying...", "info"); fetchBooks(); }}
                className="underline font-medium inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </span>
          </div>
        )}

        {/* Book grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16 sm:py-24 fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-violet-50 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <BookOpen className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-2">Your library is empty</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Upload your first ebook and we&apos;ll convert it to an audiobook with chapter navigation.
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Your First Book
            </button>
          </div>
        ) : (
          <section className="fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title">Your Books</h2>
              <span className="text-xs text-[var(--text-muted)]">{books.length} book{books.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {books.map((book, i) => (
                <div key={book.id} className="fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <BookCard {...book} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
