"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Clock, Headphones, Sparkles } from "lucide-react";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  status: string;
  duration_seconds: number;
}

const GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-pink-600",
  "from-blue-500 to-cyan-600",
  "from-rose-500 to-red-600",
  "from-violet-500 to-fuchsia-600",
];

export default function BookCard({ id, title, author, status, duration_seconds }: BookCardProps) {
  const router = useRouter();
  const gradient = GRADIENTS[id.charCodeAt(id.length - 1) % GRADIENTS.length];

  const statusConfig: Record<string, { label: string; className: string }> = {
    ready: { label: "Ready", className: "badge-success" },
    processing: { label: "Converting", className: "badge-warning" },
    uploading: { label: "Uploading", className: "badge-info" },
    error: { label: "Failed", className: "badge-error" },
  };

  const cfg = statusConfig[status] || { label: status, className: "badge-info" };

  return (
    <div
      onClick={() => router.push(`/books/${id}`)}
      className="group card card-hover overflow-hidden cursor-pointer animate-fade-in"
    >
      {/* Top gradient bar */}
      <div className={`h-2 bg-gradient-to-r ${gradient}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className={cfg.className}>{cfg.label}</span>
        </div>

        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{author}</p>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            <span>{Math.floor(duration_seconds / 60)} min</span>
          </div>
          {status === "ready" && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Headphones className="w-3.5 h-3.5" />
              <span>Listen</span>
            </div>
          )}
          {status === "processing" && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Processing</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
