import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: {
    default: "Audiobook Converter",
    template: "%s — Audiobook Converter",
  },
  description: "Convert your ebooks into audiobooks with AI-powered TTS. Supports EPUB, PDF, TXT. Free local TTS + premium cloud voices.",
  keywords: ["audiobook", "tts", "text-to-speech", "ebook", "epub", "pdf", "kokoro", "chatterbox"],
  openGraph: {
    title: "Audiobook Converter",
    description: "Turn your books into audiobooks with AI-powered TTS.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎧</text></svg>" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = localStorage.getItem('theme');
              const d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (d) document.documentElement.classList.add('dark');
            } catch(e) {}
          `,
        }} />
      </head>
      <body className="min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
