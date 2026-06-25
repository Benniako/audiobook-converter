"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Clock, FileText } from "lucide-react";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  status: string;
  duration_seconds: number;
}

export default function BookCard({ id, title, author, status, duration_seconds }: BookCardProps) {
  const router = useRouter();
  const statusColors: Record<string, string> = {
    ready: "bg-green-100 text-green-700",
    processing: "bg-yellow-100 text-yellow-700",
    uploading: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div
      onClick={() => router.push(`/books/${id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <BookOpen className="w-6 h-6 text-indigo-600" />
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100"}`}>
          {status}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{author}</p>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{Math.floor(duration_seconds / 60)} min</span>
        <FileText className="w-3.5 h-3.5 ml-2" />
      </div>
    </div>
  );
}
