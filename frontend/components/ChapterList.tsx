"use client";

import { useState, useCallback } from "react";
import { Play, Pause, CheckCircle2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  onReorder?: (chapterIds: string[]) => void;
}

function SortableChapter({
  chapter,
  isCurrent,
  isPlaying,
  isCompleted,
  onPlay,
}: {
  chapter: Chapter;
  isCurrent: boolean;
  isPlaying: boolean;
  isCompleted: boolean;
  onPlay: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center w-full rounded-xl transition-all duration-150 group ${
        isCurrent
          ? "bg-[var(--primary)]/5 border border-[var(--primary)]/20 shadow-sm"
          : "hover:bg-gray-50 border border-transparent"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="px-2 py-3.5 cursor-grab active:cursor-grabbing text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-secondary)] transition-all flex-shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Play button */}
      <button
        onClick={() => onPlay(chapter.id)}
        className="flex items-center gap-4 px-3 py-3.5 flex-1 min-w-0 text-left"
      >
        <div
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
            isCurrent
              ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-md"
              : isCompleted
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-gray-50 text-[var(--text-muted)] group-hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate ${
              isCurrent ? "font-semibold text-[var(--primary)]" : "font-medium text-gray-800"
            }`}
          >
            {chapter.title}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Chapter {chapter.index + 1}{" "}
            <span className="mx-1">·</span>{" "}
            {Math.floor(chapter.duration_seconds / 60)} min
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
              {Math.floor(chapter.duration_seconds / 60)}:{String(chapter.duration_seconds % 60).padStart(2, "0")}
            </span>
          )}
          <div
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              isCurrent ? "bg-[var(--primary)] animate-pulse" : "bg-transparent"
            }`}
          />
        </div>
      </button>
    </div>
  );
}

export default function ChapterList({
  chapters,
  currentChapterId,
  isPlaying,
  onPlay,
  completedChapters,
  onReorder,
}: ChapterListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = chapters.findIndex((ch) => ch.id === active.id);
      const newIndex = chapters.findIndex((ch) => ch.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...chapters];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      onReorder?.(reordered.map((ch) => ch.id));
    },
    [chapters, onReorder]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={chapters.map((ch) => ch.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {chapters.map((ch) => (
            <SortableChapter
              key={ch.id}
              chapter={ch}
              isCurrent={ch.id === currentChapterId}
              isPlaying={isPlaying}
              isCompleted={completedChapters.has(ch.id)}
              onPlay={onPlay}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
