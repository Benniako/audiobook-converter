"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";
import Skeleton from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  Plus, Mic, Trash2, CheckCircle, Clock, AlertCircle, RefreshCw
} from "lucide-react";

interface VoiceProfile {
  id: string; name: string; description: string | null;
  status: string; sample_count: number; error_message: string | null;
  created_at: string; updated_at: string;
}

export default function VoicesClient() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const fetchProfiles = async () => {
    try {
      const data = await api.listVoiceProfiles();
      setProfiles(data);
    } catch (err: any) {
      toast(err.message || "Could not load voice profiles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const profile = await api.createVoiceProfile({ name: newName.trim(), description: newDesc.trim() || undefined });
      setProfiles((prev) => [profile as any, ...prev]);
      setNewName(""); setNewDesc(""); setShowCreate(false);
      toast("Voice profile created! Upload audio samples to activate.", "success");
    } catch (err: any) {
      toast(err.message || "Failed to create profile", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteVoiceProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast("Profile deleted", "info");
    } catch (err: any) {
      toast(err.message || "Failed to delete", "error");
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "ready":
        return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3" /> Ready</span>;
      case "creating":
        return <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><Clock className="w-3 h-3 animate-pulse" /> Processing</span>;
      case "error":
        return <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400"><AlertCircle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="text-xs text-[var(--text-muted)]">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <Nav title="Voice Profiles" actions={
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Profile</span>
        </button>
      } />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {showCreate && (
          <div className="card p-5 space-y-4 slide-up">
            <h2 className="font-semibold text-[var(--text)]">New Voice Profile</h2>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Sarah's Voice)"
              className="input-field"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className="input-field"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary text-sm">Create</button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5"><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 sm:py-24 fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Mic className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-2">No voice profiles yet</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Create a profile, upload audio samples of someone&apos;s voice, and we&apos;ll clone it for TTS conversion.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Profile</button>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/voices/${p.id}`)}
                className="card card-hover p-4 sm:p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--text)] truncate">{p.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {p.sample_count} sample{p.sample_count !== 1 ? "s" : ""}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={p.status} />
                  {p.status === "error" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); api.retryVoiceExtraction(p.id).then(fetchProfiles).catch(() => {}); }}
                      className="btn-ghost p-1.5 text-xs"
                      title="Retry"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                    className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
