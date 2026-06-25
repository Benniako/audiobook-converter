"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

interface Toast {
  id: number;
  type: "success" | "error" | "info" | "warning";
  message: string;
  exiting?: boolean;
}

interface ToastContextType {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  error: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  info: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  warning: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${COLORS[t.type]} ${
                t.exiting ? "animate-toast-out" : "animate-toast-in"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="p-0.5 hover:opacity-70 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
