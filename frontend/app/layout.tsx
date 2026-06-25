import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audiobook Converter",
  description: "Convert your ebooks into audiobooks with AI-powered TTS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
