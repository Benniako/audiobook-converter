"use client";

interface ProgressBarProps {
  progress: number;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued", color: "from-blue-400 to-blue-500" },
  parsing: { label: "Parsing ebook", color: "from-violet-400 to-violet-500" },
  synthesizing: { label: "Generating audio", color: "from-amber-400 to-orange-500" },
  assembling: { label: "Assembling audiobook", color: "from-rose-400 to-pink-500" },
  done: { label: "Complete!", color: "from-emerald-400 to-emerald-500" },
  failed: { label: "Failed", color: "from-red-400 to-red-500" },
};

export default function ProgressBar({ progress, status }: ProgressBarProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: "from-gray-400 to-gray-500" };
  const pct = Math.min(100, Math.round(progress * 100));

  return (
    <div className="card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-pulse`} />
          <span className="text-sm font-medium text-gray-800">{config.label}</span>
        </div>
        <span className="text-sm font-mono text-[var(--text-muted)]">{pct}%</span>
      </div>

      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>

      {status === "failed" && (
        <p className="text-xs text-red-500">An error occurred during conversion. Please try again.</p>
      )}
    </div>
  );
}
