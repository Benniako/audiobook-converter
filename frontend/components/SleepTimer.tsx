"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Moon } from "lucide-react";

interface SleepTimerProps {
  onSleep: () => void;
}

const OPTIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "60 minutes", value: 60 },
  { label: "End of chapter", value: -1 },
];

export default function SleepTimer({ onSleep }: SleepTimerProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active === null || active === -1) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setRemaining(active * 60);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setActive(null);
          onSleep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, onSleep]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`btn-ghost p-2 text-xs flex items-center gap-1 ${active !== null ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
        title="Sleep timer"
      >
        <Moon className="w-3.5 h-3.5" />
        {active !== null && <span className="font-mono">{formatTime(remaining)}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[160px]">
            <div className="px-4 py-2 text-xs font-medium text-[var(--text-muted)] border-b border-[var(--border)] flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Sleep Timer
            </div>
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setActive(opt.value); setOpen(false); }}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  active === opt.value ? "text-indigo-600 font-medium" : "text-[var(--text-secondary)]"
                }`}
              >
                {opt.label} {active === opt.value && "✓"}
              </button>
            ))}
            {active !== null && (
              <button
                onClick={() => { setActive(null); setOpen(false); if (intervalRef.current) clearInterval(intervalRef.current); }}
                className="w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-[var(--border)]"
              >
                Cancel Timer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
