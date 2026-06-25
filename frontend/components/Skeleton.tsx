"use client";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export default function Skeleton({ className = "h-4 w-full", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-100 dark:via-gray-600 to-gray-200 dark:to-gray-700 bg-[length:200%_100%] rounded-lg animate-pulse ${className}`}
        />
      ))}
    </>
  );
}

export function BookCardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl skeleton" />
        <div className="w-16 h-5 rounded-full skeleton" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="pt-3 border-t border-[var(--border)]">
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
