"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UploadZone from "@/components/UploadZone";
import { ArrowLeft } from "lucide-react";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const book = await api.uploadBook(file);
      // Start conversion with default Kokoro
      await api.startConversion(book.id);
      router.push(`/books/${book.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Upload a Book</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}
        <UploadZone onUpload={handleUpload} uploading={uploading} />
        <div className="mt-8 bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Supported Formats</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full" /> EPUB — Standard ebook format</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full" /> PDF — Chapter detection via text analysis</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full" /> TXT — Plain text with chapter markers</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
