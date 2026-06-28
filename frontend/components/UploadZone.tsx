"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, File, X, BookOpen, FileText } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  onFileSelect?: (file: File | null) => void;
  multiple?: boolean;
}

export default function UploadZone({ onUpload, uploading, onFileSelect, multiple }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadIndex, setUploadIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) { setSelectedFiles(files); onFileSelect?.(files[0]); }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) { setSelectedFiles(files); onFileSelect?.(files[0]); }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      setUploadIndex(0);
      // Upload files sequentially
      selectedFiles.forEach((file) => onUpload(file));
    }
  };

  const getIcon = () => {
    if (selectedFiles.length === 0) return <Upload className="w-12 h-12 text-[var(--primary-light)]" />;
    if (selectedFiles.length > 1) {
      return (
        <div className="flex -space-x-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <FileText className="w-6 h-6 text-red-500" />
        </div>
      );
    }
    const ext = selectedFiles[0].name.split(".").pop()?.toLowerCase();
    if (ext === "epub") return <BookOpen className="w-8 h-8 text-indigo-600" />;
    if (ext === "pdf") return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-amber-500" />;
  };

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-4">
      <div
        onClick={handleClick}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.02]"
            : selectedFiles.length > 0
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
            selectedFiles.length > 0 ? "bg-emerald-100" : dragOver ? "bg-[var(--primary)]/10" : "bg-gray-100"
          }`}>
            {getIcon()}
          </div>

          {selectedFiles.length > 0 ? (
            <div className="space-y-3">
              {selectedFiles.length === 1 ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFiles[0].name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {(selectedFiles[0].size / 1024 / 1024).toFixed(1)} MB
                      {" · "}
                      {selectedFiles[0].name.split(".").pop()?.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); onFileSelect?.(null); }}
                    className="p-1.5 hover:bg-gray-200/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-gray-900">{selectedFiles.length} files selected</p>
                  <p className="text-sm text-[var(--text-muted)]">{(totalSize / 1024 / 1024).toFixed(1)} MB total</p>
                  <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="text-xs text-[var(--text-muted)] flex items-center gap-2 justify-center">
                        <span>{f.name}</span>
                        <span className="opacity-60">({(f.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setSelectedFiles([]); onFileSelect?.(null); }}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-1 cursor-pointer">
                <span className="font-semibold text-[var(--primary)]">Click to upload</span>{" "}
                or drag and drop
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                EPUB, PDF, or TXT &mdash; up to 100MB each {multiple ? "(multiple)" : ""}
              </p>
              <input
                type="file"
                accept=".epub,.pdf,.txt"
                onChange={handleChange}
                className="hidden"
                id="file-upload"
                ref={inputRef}
                multiple={multiple}
              />
            </div>
          )}
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {selectedFiles.length > 1 ? `Converting ${selectedFiles.length} files...` : "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {selectedFiles.length > 1 ? `Upload & Convert All (${selectedFiles.length} files)` : "Upload & Start Conversion"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
