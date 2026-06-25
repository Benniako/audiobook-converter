"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { key: "Space", action: "Play / Pause" },
  { key: "←", action: "Previous chapter" },
  { key: "→", action: "Next chapter" },
  { key: "M", action: "Toggle mute" },
  { key: "+ / -", action: "Volume up / down" },
  { key: "?", action: "Show this help" },
];

export default function ShortcutOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[var(--text)]">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[var(--text-secondary)]">{s.action}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-[var(--border)] text-xs font-mono font-medium text-[var(--text)]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-[var(--text-muted)] text-center">Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">?</kbd> to toggle</p>
      </div>
    </div>
  );
}
