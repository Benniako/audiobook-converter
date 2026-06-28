"use client";

import { useEffect, useState, useCallback } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [showMenu, setShowMenu] = useState(false);

  const applyTheme = useCallback((m: ThemeMode) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = m === "dark" || (m === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    const initial = stored || "system";
    setMode(initial);
    applyTheme(initial);

    // Listen for system theme changes when in "system" mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, applyTheme]);

  const setTheme = (m: ThemeMode) => {
    setMode(m);
    setShowMenu(false);
    localStorage.setItem("theme", m);
    applyTheme(m);
  };

  const modes: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
    { mode: "light", icon: Sun, label: "Light" },
    { mode: "dark", icon: Moon, label: "Dark" },
    { mode: "system", icon: Monitor, label: "System" },
  ];

  const currentIcon = modes.find((m) => m.mode === mode)?.icon || Monitor;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn-ghost p-2 relative"
        aria-label="Toggle dark mode"
      >
        <Sun className={`w-4 h-4 transition-all duration-200 ${mode === "dark" ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"}`} />
        <Moon className={`w-4 h-4 transition-all duration-200 ${mode === "dark" ? "opacity-100 scale-100" : "opacity-0 scale-0 absolute"}`} />
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 min-w-[110px]">
            {modes.map(({ mode: m, icon: Icon, label }) => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  mode === m
                    ? "text-indigo-600 dark:text-indigo-400 font-medium"
                    : "text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
