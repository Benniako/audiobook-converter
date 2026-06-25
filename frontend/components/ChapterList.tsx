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
      {chapters.map((ch) => {
        const isCurrent = ch.id === currentChapterId;
        const isCompleted = completedChapters.has(ch.id);
        return (
          <button
            key={ch.id}
            onClick={() => onPlay(ch.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              isCurrent ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isCurrent ? "bg-indigo-600 text-white" : isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}>
              {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isCurrent ? "font-medium text-indigo-700" : "text-gray-700"}`}>
                {ch.title}
              </p>
              <p className="text-xs text-gray-400">Chapter {ch.index + 1}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.floor(ch.duration_seconds / 60)}:{String(ch.duration_seconds % 60).padStart(2, "0")}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
