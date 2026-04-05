"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";

type ToastRecord = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastRecord, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast(toast) {
        const id = crypto.randomUUID();
        setToasts((current) => [...current, { ...toast, id }].slice(-3));

        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 3200);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-3 shadow-[var(--shadow-strong)] backdrop-blur-xl",
              toast.tone === "success"
                ? "border-[var(--accent-green-border)] bg-[var(--accent-green-soft)]"
                : "border-[var(--accent-red-border)] bg-[var(--accent-red-soft)]",
            )}
          >
            <div className="flex items-start gap-3">
              {toast.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--accent-green)]" />
              ) : (
                <CircleAlert className="mt-0.5 h-4 w-4 text-[var(--accent-red)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                className="rounded-full p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
}
