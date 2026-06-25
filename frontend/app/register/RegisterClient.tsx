"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BookOpen, Eye, EyeOff, Mail, Lock, CheckCircle, XCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";

export default function RegisterClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const router = useRouter();
  const { toast } = useToast();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const showEmailError = touched.email && email.length > 0 && !emailValid;
  const showPasswordError = touched.password && password.length > 0 && !passwordValid;
  const showConfirmError = touched.confirm && confirmPassword.length > 0 && !passwordsMatch;

  const strength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: "Weak", bars: 1, color: "bg-red-500" };
    if (password.length < 10) return { label: "Fair", bars: 2, color: "bg-amber-500" };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: "Strong", bars: 3, color: "bg-emerald-500" };
    return { label: "Good", bars: 2, color: "bg-blue-500" };
  };
  const pwStrength = strength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid || !passwordsMatch) { setError("Please fix the errors"); return; }
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
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Create account</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Start converting books to audiobooks</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4 shadow-xl" noValidate>
          {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                className={`input-field pl-10 ${showEmailError ? "border-red-300 dark:border-red-700" : ""}`} required />
            </div>
            {showEmailError && <p className="text-xs text-red-500 mt-1">Please enter a valid email</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                className={`input-field pl-10 pr-10 ${showPasswordError ? "border-red-300 dark:border-red-700" : ""}`}
                required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwStrength && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1 flex-1 rounded-full ${s <= pwStrength.bars ? pwStrength.color : "bg-gray-200 dark:bg-gray-700"} transition-colors`} />
                  ))}
                </div>
                <p className={`text-[10px] ${pwStrength.label === "Weak" ? "text-red-500" : pwStrength.label === "Fair" ? "text-amber-500" : "text-emerald-500"}`}>{pwStrength.label}</p>
              </div>
            )}
            {showPasswordError && <p className="text-xs text-red-500 mt-1">Minimum 6 characters</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="password" placeholder="••••••••" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                className={`input-field pl-10 ${showConfirmError ? "border-red-300 dark:border-red-700" : confirmPassword.length > 0 && passwordsMatch ? "border-emerald-300 dark:border-emerald-700" : ""}`}
                required minLength={6} />
            </div>
            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {passwordsMatch
                  ? <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500">Passwords match</span></>
                  : <><XCircle className="w-3 h-3 text-red-500" /><span className="text-xs text-red-500">Passwords don&apos;t match</span></>
                }
              </div>
            )}
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
