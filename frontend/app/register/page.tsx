"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BookOpen } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await api.register(email, password);
      await api.login(email, password);
      toast("Account created! Welcome 🎉", "success");
      router.push("/dashboard");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 dark:from-indigo-950/30 via-[var(--surface-alt)] to-violet-50 dark:to-violet-950/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Create account</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Start converting books to audiobooks</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4 shadow-xl">
          {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required minLength={6} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</> : "Create Account"}
          </button>

          <p className="text-center text-sm text-[var(--text-muted)]">
            Already have one? <a href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
