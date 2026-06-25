"use client";

import { useState, useCallback } from "react";
import { Upload, File, X, BookOpen, FileText } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  uploading: boolean;
}

export default function UploadZone({ onUpload, uploading }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const getIcon = () => {
    if (!selectedFile) return <Upload className="w-12 h-12 text-[var(--primary-light)]" />;
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext === "epub") return <BookOpen className="w-8 h-8 text-indigo-600" />;
    if (ext === "pdf") return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-amber-500" />;
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.02]"
            : selectedFile
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-gray-300 hover:border-[var(--primary-light)] hover:bg-gray-50/50"
        }`}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, var(--primary) 0%, transparent 50%)`,
          }} />
        </div>

        <div className="relative">
          <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
            selectedFile ? "bg-emerald-100" : dragOver ? "bg-[var(--primary)]/10" : "bg-gray-100"
          }`}>
            {getIcon()}
          </div>

          {selectedFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="text-left">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    {" · "}
                    {selectedFile.name.split(".").pop()?.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="p-1.5 hover:bg-gray-200/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-1">
                <span className="font-semibold text-[var(--primary)]">Click to upload</span>{" "}
                or drag and drop
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                EPUB, PDF, or TXT &mdash; up to 100MB
              </p>
              <input
                type="file"
                accept=".epub,.pdf,.txt"
                onChange={handleChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer" />
            </div>
          )}
        </div>
      </div>

      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload & Start Conversion
            </>
          )}
        </button>
      )}
    </div>
  );
}
