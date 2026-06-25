"use client";

import { Play, Pause, CheckCircle2, Clock } from "lucide-react";

interface Chapter {
  id: string;
  index: number;
  title: string;
  duration_seconds: number;
}

interface ChapterListProps {
  chapters: Chapter[];
  currentChapterId: string | null;
  isPlaying: boolean;
  onPlay: (chapterId: string) => void;
  completedChapters: Set<string>;
}

export default function ChapterList({ chapters, currentChapterId, isPlaying, onPlay, completedChapters }: ChapterListProps) {
  return (
    <div className="space-y-1">
      {chapters.map((ch, i) => {
        const isCurrent = ch.id === currentChapterId;
        const isCompleted = completedChapters.has(ch.id);
        return (
          <button
            key={ch.id}
            data-chapter-id={ch.id}
            onClick={() => onPlay(ch.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-150 group ${
              isCurrent
                ? "bg-[var(--primary)]/5 border border-[var(--primary)]/20 shadow-sm"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            {/* Number / Play button */}
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              isCurrent
                ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-md"
                : isCompleted
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-gray-50 text-[var(--text-muted)] group-hover:bg-gray-100 border border-gray-200"
            }`}>
              {isCurrent && isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${
                isCurrent ? "font-semibold text-[var(--primary)]" : "font-medium text-gray-800"
              }`}>
                {ch.title}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Chapter {ch.index + 1}{" "}
                <span className="mx-1">·</span>{" "}
                {Math.floor(ch.duration_seconds / 60)} min
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isCompleted && !isCurrent && (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
              {!isCompleted && !isCurrent && (
                <span className="text-xs text-[var(--text-muted)]">
                  {Math.floor(ch.duration_seconds / 60)}:{String(ch.duration_seconds % 60).padStart(2, "0")}
                </span>
              )}
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${
                isCurrent ? "bg-[var(--primary)] animate-pulse" : "bg-transparent"
              }`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
