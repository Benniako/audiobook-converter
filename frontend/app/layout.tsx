import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Audiobook Converter",
  description: "Convert your ebooks into audiobooks with AI-powered TTS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
