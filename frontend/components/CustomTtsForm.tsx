"use client";

import { useState } from "react";

interface CustomTtsFormProps {
  onSubmit: (data: { name: string; provider_type: string; config: string }) => Promise<void>;
  initial?: { name: string; provider_type: string; config: string };
}

export default function CustomTtsForm({ onSubmit, initial }: CustomTtsFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [providerType, setProviderType] = useState(initial?.provider_type || "script");
  const [configJson, setConfigJson] = useState(initial?.config || "{}");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Validate JSON
      JSON.parse(configJson);
      await onSubmit({ name, provider_type: providerType, config: configJson });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const configPlaceholders: Record<string, string> = {
    script: '{"module_path": "/path/to/tts.py", "function_name": "synthesize"}',
    cli: '{"command": "echo \'{text}\' | my-tts --output {output}"}',
    http: '{"url": "http://localhost:5000/tts", "headers": {"Authorization": "Bearer ..."}}',
    local_model: '{"model_path": "/models/my-voice", "language": "en"}',
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
      <h3 className="font-semibold text-lg">{initial ? "Edit" : "Add"} Custom TTS Provider</h3>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="My Custom Voice" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type</label>
        <select value={providerType} onChange={(e) => { setProviderType(e.target.value); setConfigJson(configPlaceholders[e.target.value] || "{}"); }}
          className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="script">Python Script</option>
          <option value="cli">CLI Command</option>
          <option value="http">HTTP Endpoint</option>
          <option value="local_model">Local Model Path</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
        <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)} rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
      </div>

      <button type="submit" disabled={submitting}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
        {submitting ? "Saving..." : "Save Provider"}
      </button>
    </form>
  );
}
