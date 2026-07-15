"use client";

import { useCallback, useState } from "react";

export interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

let toastId = 0;

/** Minimal local toast stack — each portal page owns its own instance. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, variant: ToastItem["variant"] = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            t.variant === "success" ? "bg-oceanic-dark text-white" : "bg-red-600 text-white"
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="text-white/70 hover:text-white" aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
