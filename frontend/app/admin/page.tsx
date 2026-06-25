"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import CustomTtsForm from "@/components/CustomTtsForm";
import { Settings, Trash2, TestTube, ArrowLeft, RefreshCw } from "lucide-react";

interface CustomTTS {
  id: string;
  name: string;
  provider_type: string;
  config: string;
  is_active: boolean;
}

interface AdminStats {
  total_users: number;
  total_books: number;
  pending_jobs: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<CustomTTS[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; result: string } | null>(null);

  const fetchData = async () => {
    try {
      const [p, s] = await Promise.all([api.getCustomTTSProviders(), api.getAdminStats()]);
      setProviders(p);
      setStats(s);
    } catch {
      router.push("/dashboard");
    }
  };

  useEffect(() => { fetchData(); }, [router]);

  const handleCreate = async (data: { name: string; provider_type: string; config: string }) => {
    await api.createCustomTTS(data);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this TTS provider?")) return;
    await api.deleteCustomTTS(id);
    fetchData();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await api.testCustomTTS(id);
      setTestResult({ id, result: result.success ? `OK (${result.audio_size_bytes} bytes)` : `Failed: ${result.error}` });
    } catch (err: any) {
      setTestResult({ id, result: `Error: ${err.message}` });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Admin Panel
            </h1>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            {showForm ? "Cancel" : "Add TTS Engine"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_users}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Total Books</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_books}</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm text-gray-500">Pending Jobs</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending_jobs}</p>
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="mb-8">
            <CustomTtsForm onSubmit={handleCreate} />
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`mb-4 p-4 rounded-lg text-sm ${
            testResult.result.startsWith("OK") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            <strong>{testResult.id.substring(0, 8)}:</strong> {testResult.result}
            <button onClick={() => setTestResult(null)} className="ml-3 underline">Dismiss</button>
          </div>
        )}

        {/* Provider list */}
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Custom TTS Engines</h2>
          </div>
          {providers.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No custom TTS providers configured yet</div>
          ) : (
            <div className="divide-y">
              {providers.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.provider_type} {p.is_active ? "" : "(inactive)"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleTest(p.id)} disabled={testingId === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      {testingId === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      Test
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
