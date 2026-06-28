"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Mic, CheckCircle, ChevronDown } from "lucide-react";

interface VoiceProfile {
  id: string; name: string; status: string; sample_count: number; description: string | null;
}

interface VoiceSelectorProps {
  selectedProfileId: string | null;
  onSelect: (profileId: string | null) => void;
}

export default function VoiceSelector({ selectedProfileId, onSelect }: VoiceSelectorProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.listVoiceProfiles()
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const readyProfiles = profiles.filter((p) => p.status === "ready");
  const selected = profiles.find((p) => p.id === selectedProfileId);

  if (loading || readyProfiles.length === 0) return null;

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
        Cloned Voice
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] hover:border-purple-400 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Mic className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="truncate">{selected ? selected.name : "Select a voice..."}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                !selectedProfileId ? "text-purple-600 font-medium" : "text-[var(--text-secondary)]"
              }`}
            >
              None (default voice)
            </button>
            {readyProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                  selectedProfileId === p.id ? "text-purple-600 font-medium" : "text-[var(--text-secondary)]"
                }`}
              >
                <span>{p.name}</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
