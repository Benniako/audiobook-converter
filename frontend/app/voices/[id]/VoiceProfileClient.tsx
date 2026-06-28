"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";
import AudioPlayer from "@/components/AudioPlayer";
import { useToast } from "@/components/Toast";
import {
  Upload, Mic, CheckCircle, Clock, AlertCircle, RefreshCw, Play, FileAudio, Music, Trash2, ArrowLeft
} from "lucide-react";

interface VoiceSample {
  id: string; file_path: string; duration_seconds: number; created_at: string;
}

interface VoiceProfile {
  id: string; name: string; description: string | null;
  status: string; sample_count: number; error_message: string | null;
  created_at: string; updated_at: string;
  audio_samples: VoiceSample[];
}

export default function VoiceProfileClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    try {
      const data = await api.getVoiceProfile(id);
      setProfile(data);
    } catch (err: any) {
      toast(err.message || "Could not load profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [id]);

  useEffect(() => {
    if (!profile || profile.status !== "creating") return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getVoiceProfile(id);
        setProfile(data);
        if (data.status !== "creating") clearInterval(interval);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [profile?.status, id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await api.uploadVoiceSamples(id, files);
      toast("Samples uploaded! Processing voice...", "success");
      fetchProfile();
    } catch (err: any) {
      toast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const url = api.getVoicePreviewUrl(id);
      setPreviewAudio(url);
      setIsPlaying(true);
    } catch {
      toast("Preview not available", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      await api.retryVoiceExtraction(id);
      toast("Restarting extraction...", "info");
      fetchProfile();
    } catch (err: any) {
      toast(err.message || "Failed to retry", "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--surface-alt)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
  if (!profile) return null;

  const statusIcons: Record<string, React.ReactNode> = {
    ready: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    creating: <Clock className="w-5 h-5 text-amber-500 animate-pulse" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
  };

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <Nav title={profile.name} actions={
        profile.status === "ready" && (
          <button onClick={handlePreview} disabled={previewLoading} className="btn-secondary text-sm">
            {previewLoading ? (
              <><div className="w-3.5 h-3.5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" /> Loading</>
            ) : (
              <><Play className="w-4 h-4" /> Test Voice</>
            )}
          </button>
        )
      } />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Status card */}
        <div className="glass-card p-5 flex items-center gap-4 fade-in">
          {statusIcons[profile.status] || null}
          <div className="flex-1">
            <p className="font-medium text-[var(--text)]">
              Status: {profile.status === "ready" ? "Ready to use" : profile.status === "creating" ? "Processing voice..." : "Error"}
            </p>
            {profile.status === "creating" && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Extracting speaker profile from {profile.sample_count} sample{profile.sample_count !== 1 ? "s" : ""}...
                <span className="ml-2 text-amber-500">This may take a minute</span>
              </p>
            )}
            {profile.status === "error" && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-red-500">{profile.error_message || "Unknown error"}</p>
                <button onClick={handleRetry} className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}
            {profile.status === "ready" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Ready for use in book conversions
              </p>
            )}
          </div>
        </div>

        {/* Preview audio */}
        {previewAudio && (
          <AudioPlayer
            audioUrl={previewAudio}
            title="Voice Preview"
            playing={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Upload samples */}
        <div className="card p-5 sm:p-6">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-[var(--primary)]" /> Audio Samples
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
            Upload clear recordings of the person speaking. WAV or MP3, at least 10 seconds each, 50MB max per file.
            Voice cloning works best with <strong>clean, isolated speech</strong> (no background music or noise).
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 sm:p-12 text-center cursor-pointer hover:border-purple-400 transition-colors"
          >
            <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="text-purple-500 font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              WAV, MP3, M4A, or OGG — {profile.sample_count} sample{profile.sample_count !== 1 ? "s" : ""} uploaded
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a,.ogg,.flac"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 mt-3 text-sm text-[var(--text-secondary)]">
              <div className="w-4 h-4 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
              Uploading...
            </div>
          )}
        </div>

        {/* Sample list */}
        {profile.audio_samples.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
              Uploaded Samples ({profile.audio_samples.length})
            </h3>
            <div className="space-y-2">
              {profile.audio_samples.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] truncate">Sample {i + 1}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{Math.round(s.duration_seconds)}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
