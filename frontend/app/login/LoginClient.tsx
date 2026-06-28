"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { BookOpen, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const data = await api.login(email, password);
      api.setToken(data.access_token);
      toast("Welcome back!", "success");
      router.push("/dashboard");
    } catch (err: any) {
      toast(err.message || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-transparent to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-8 fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-center text-[var(--text)] mb-1">Sign In</h1>
        <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
          Access your audiobook library
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field pl-10"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="btn-primary w-full"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><ArrowRight className="w-4 h-4" /> Sign In</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
