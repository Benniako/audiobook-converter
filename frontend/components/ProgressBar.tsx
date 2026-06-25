"use client";

interface ProgressBarProps {
  progress: number;
  status: string;
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const pct = Math.round(progress * 100);
  const statusLabels: Record<string, string> = {
    queued: "Queued...",
    parsing: "Parsing ebook...",
    synthesizing: "Synthesizing audio...",
    assembling: "Assembling audiobook...",
    done: "Complete!",
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">{statusLabels[status] || status}</span>
        <span className="text-sm text-gray-500">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
