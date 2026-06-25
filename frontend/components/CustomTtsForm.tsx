"use client";

import { useState } from "react";

interface CustomTtsFormProps {
  onSubmit: (data: { name: string; provider_type: string; config: string }) => Promise<void>;
  initial?: { name: string; provider_type: string; config: string };
  onCancel?: () => void;
}

const PROVIDER_TYPES = [
  { value: "script", label: "Python Script", desc: "Call a Python module/function", icon: "🐍" },
  { value: "cli", label: "CLI Command", desc: "Pipe text to a shell command", icon: "💻" },
  { value: "http", label: "HTTP Endpoint", desc: "Call an internal/external API", icon: "🌐" },
  { value: "local_model", label: "Local Model", desc: "Path to TTS model on disk", icon: "📂" },
];

const CONFIG_TEMPLATES: Record<string, string> = {
  script: JSON.stringify({ module_path: "/path/to/tts.py", function_name: "synthesize" }, null, 2),
  cli: JSON.stringify({ command: "echo '{text}' | my-tts --voice {voice} --output {output}" }, null, 2),
  http: JSON.stringify({ url: "http://localhost:5000/tts", headers: { Authorization: "Bearer ..." } }, null, 2),
  local_model: JSON.stringify({ model_path: "/models/my-voice", language: "en", voices: [{ id: "default", name: "My Voice" }] }, null, 2),
};

export default function CustomTtsForm({ onSubmit, initial, onCancel }: CustomTtsFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [providerType, setProviderType] = useState(initial?.provider_type || "script");
  const [configJson, setConfigJson] = useState(initial?.config || CONFIG_TEMPLATES.script);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      JSON.parse(configJson);
      await onSubmit({ name, provider_type: providerType, config: configJson });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setProviderType(type);
    setConfigJson(CONFIG_TEMPLATES[type] || "{}");
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900">
          {initial ? "Edit Provider" : "Add TTS Provider"}
        </h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200/50 text-red-600 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="input-field" placeholder="e.g. My Custom Voice" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Provider Type</label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => handleTypeChange(pt.value)}
              className={`p-3 rounded-xl text-left border transition-all ${
                providerType === pt.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/20"
                  : "border-[var(--border)] hover:border-gray-300"
              }`}
            >
              <span className="text-lg">{pt.icon}</span>
              <p className="font-medium text-sm text-gray-900 mt-1">{pt.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{pt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Configuration (JSON)</label>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{providerType}</span>
        </div>
        <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)} rows={8}
          className="input-field font-mono text-xs" spellCheck={false} />
      </div>

      <button type="submit" disabled={submitting}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {submitting ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
        ) : (
          initial ? "Update Provider" : "Add Provider"
        )}
      </button>
    </form>
  );
}
