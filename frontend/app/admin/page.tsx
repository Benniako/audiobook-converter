"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import CustomTtsForm from "@/components/CustomTtsForm";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { Settings, Trash2, TestTube, ArrowLeft, RefreshCw, Plus, Shield, Users, BookOpen, AlertCircle } from "lucide-react";

interface CustomTTS { id: string; name: string; provider_type: string; config: string; is_active: boolean; }
interface AdminStats { total_users: number; total_books: number; pending_jobs: number; }

const TYPE_ICONS: Record<string, string> = { script: "🐍", cli: "💻", http: "🌐", local_model: "📂" };

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [providers, setProviders] = useState<CustomTTS[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; result: string; success: boolean } | null>(null);
  const [authError, setAuthError] = useState(false);

  const fetchData = async () => {
    try { const [p, s] = await Promise.all([api.getCustomTTSProviders(), api.getAdminStats()]); setProviders(p); setStats(s); }
    catch (err: any) { if (err.message.includes("403") || err.message.includes("Unauthorized")) setAuthError(true); }
  };
  useEffect(() => { fetchData(); }, [router]);

  const handleCreate = async (data: { name: string; provider_type: string; config: string }) => {
    await api.createCustomTTS(data); setShowForm(false); fetchData(); toast("TTS provider added", "success");
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this TTS provider?")) return;
    await api.deleteCustomTTS(id); fetchData(); toast("Provider deleted", "info");
  };
  const handleTest = async (id: string) => {
    setTestingId(id);
    try { const result = await api.testCustomTTS(id); setTestResult({ id, result: result.success ? `OK — ${result.audio_size_bytes} bytes` : `Failed: ${result.error}`, success: result.success }); }
    catch (err: any) { setTestResult({ id, result: `Error: ${err.message}`, success: false }); }
    finally { setTestingId(null); }
  };

  if (authError) return (
    <div className="min-h-screen bg-[var(--surface-alt)] flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)]">Admin Access Required</h2>
        <p className="text-sm text-[var(--text-secondary)]">Sign in with the admin account</p>
        <button onClick={() => router.push("/login")} className="btn-primary">Sign In</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--surface-alt)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md"><Settings className="w-4 h-4 text-white" /></div>
            <h1 className="font-bold text-[var(--text)]">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-1.5">
              {showForm ? "Cancel" : <><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add TTS</span></>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {stats && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Users", value: stats.total_users, icon: Users, color: "from-indigo-500 to-violet-500" },
              { label: "Books", value: stats.total_books, icon: BookOpen, color: "from-emerald-500 to-teal-500" },
              { label: "Pending", value: stats.pending_jobs, icon: Settings, color: "from-amber-500 to-orange-500" },
            ].map((s, i) => (
              <div key={i} className="card p-3 sm:p-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}><s.icon className="w-4 h-4 text-white" /></div>
                  <div><p className="text-xl sm:text-2xl font-bold text-[var(--text)]">{s.value}</p><p className="text-xs text-[var(--text-muted)]">{s.label}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && <CustomTtsForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

        {testResult && (
          <div className={`flex items-center justify-between p-4 rounded-xl border text-sm animate-fade-in ${
            testResult.success ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}>
            <span>{testResult.success ? "✅" : "❌"} <strong>{testResult.id.substring(0, 8)}:</strong> {testResult.result}</span>
            <button onClick={() => setTestResult(null)} className="underline text-xs flex-shrink-0 ml-2">Dismiss</button>
          </div>
        )}

        <div className="card">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text)]">Custom TTS Engines</h2>
            <span className="text-xs text-[var(--text-muted)]">{providers.length} total</span>
          </div>
          {providers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-[var(--text-muted)]" />
              </div>
              <p className="font-medium text-[var(--text)]">No custom TTS providers</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Add your first engine to extend capabilities</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {providers.map((p) => (
                <div key={p.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">{TYPE_ICONS[p.provider_type] || "🔊"}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text)] text-sm sm:text-base truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{p.provider_type}</span>
                        {!p.is_active && <span className="text-amber-600 dark:text-amber-400">inactive</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button onClick={() => handleTest(p.id)} disabled={testingId === p.id}
                      className="btn-secondary text-xs py-1.5 px-2 sm:px-3 flex items-center gap-1">
                      {testingId === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                      <span className="hidden sm:inline">Test</span>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-400 hover:text-red-600 transition-colors">
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
