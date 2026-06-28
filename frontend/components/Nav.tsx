"use client";

import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { BookOpen, Upload, Mic, LayoutDashboard, Settings, Menu } from "lucide-react";

interface NavProps {
  title?: string;
  backTo?: string;
  actions?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Library", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/voices", label: "Voices", icon: Mic },
  { href: "/admin", label: "Settings", icon: Settings },
];

export default function Nav({ title, backTo, actions }: NavProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <nav className="desktop-nav glass fixed top-0 left-0 right-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[var(--text)] hidden sm:inline text-sm">
                Audiobook
              </span>
            </button>

            {/* Nav links */}
            <div className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {title && (
              <span className="text-sm font-semibold text-[var(--text)] mr-2 hidden sm:inline">
                {title}
              </span>
            )}
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="desktop-nav h-16" />

      {/* Mobile bottom nav */}
      <nav className="bottom-nav md:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="md:hidden h-[60px]" />
    </>
  );
}
