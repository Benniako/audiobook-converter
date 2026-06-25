"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="btn-ghost p-2 relative"
      aria-label="Toggle dark mode"
    >
      <Sun className={`w-4 h-4 transition-all duration-200 ${dark ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"}`} />
      <Moon className={`w-4 h-4 transition-all duration-200 ${dark ? "opacity-100 scale-100" : "opacity-0 scale-0 absolute"}`} />
    </button>
  );
}
