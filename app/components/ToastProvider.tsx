"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms
  createdAt: number; // timestamp
  pausedAt?: number; // timestamp
  remaining?: number; // ms
  leaving?: boolean; // animação de saída
};

type ShowToastOptions = {
  duration?: number; // ms
};

type ToastContextType = {
  success: (msg: string, opts?: ShowToastOptions) => void;
  error: (msg: string, opts?: ShowToastOptions) => void;
  info: (msg: string, opts?: ShowToastOptions) => void;
  warning: (msg: string, opts?: ShowToastOptions) => void;

  // opcional (mantém compatibilidade e te dá flexibilidade)
  show: (type: ToastType, msg: string, opts?: ShowToastOptions) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

function uid() {
  // mais estável que Math.random puro
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const DEFAULT_DURATION = 3000;
const MAX_TOASTS = 5;
const LEAVE_MS = 180;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) window.clearTimeout(t);
    timersRef.current.delete(id);
  }, []);

  const scheduleRemove = useCallback(
    (id: string, delayMs: number) => {
      clearTimer(id);
      const t = window.setTimeout(() => {
        // animação de saída
        setToasts((prev) =>
          prev.map((x) => (x.id === id ? { ...x, leaving: true } : x))
        );

        // remove de verdade após animação
        const t2 = window.setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id));
          clearTimer(id);
        }, LEAVE_MS);

        timersRef.current.set(`${id}:leave`, t2);
      }, delayMs);

      timersRef.current.set(id, t);
    },
    [clearTimer]
  );

  const remove = useCallback(
    (id: string) => {
      clearTimer(id);
      clearTimer(`${id}:leave`);
      setToasts((prev) => prev.filter((x) => x.id !== id));
    },
    [clearTimer]
  );

  // limpa tudo ao desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const show = useCallback(
    (type: ToastType, message: string, opts?: ShowToastOptions) => {
      const id = uid();
      const duration =
        typeof opts?.duration === "number" && opts.duration >= 800
          ? Math.floor(opts.duration)
          : DEFAULT_DURATION;

      const toast: Toast = {
        id,
        type,
        message,
        duration,
        createdAt: Date.now(),
        remaining: duration,
      };

      setToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS));
      scheduleRemove(id, duration);
    },
    [scheduleRemove]
  );

  const pause = useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((x) => {
          if (x.id !== id || x.leaving) return x;

          // calcula restante
          const now = Date.now();
          const elapsed = now - x.createdAt;
          const remaining = Math.max(0, (x.remaining ?? x.duration) - elapsed);

          // pausa timer
          clearTimer(id);

          return {
            ...x,
            pausedAt: now,
            remaining,
          };
        })
      );
    },
    [clearTimer]
  );

  const resume = useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((x) => {
          if (x.id !== id || x.leaving) return x;
          if (!x.pausedAt) return x;

          // reinicia contagem a partir do restante
          const now = Date.now();
          const remaining = Math.max(0, x.remaining ?? DEFAULT_DURATION);

          // atualiza createdAt para usar elapsed de novo
          scheduleRemove(id, remaining);

          return {
            ...x,
            createdAt: now,
            pausedAt: undefined,
            remaining,
          };
        })
      );
    },
    [scheduleRemove]
  );

  const api = useMemo<ToastContextType>(
    () => ({
      show,
      success: (m, o) => show("success", m, o),
      error: (m, o) => show("error", m, o),
      info: (m, o) => show("info", m, o),
      warning: (m, o) => show("warning", m, o),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Acessibilidade:
         - "alert" para error/warning
         - "status" para info/success
      */}
      <div
        className="fixed top-4 right-4 z-[9999] space-y-3 w-[92vw] max-w-sm"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {toasts.map((t) => {
          const role = t.type === "error" || t.type === "warning" ? "alert" : "status";

          return (
            <div
              key={t.id}
              role={role}
              aria-atomic="true"
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id)}
              className={[
                "rounded-2xl shadow-lg border bg-white p-4",
                "transition-all",
                t.leaving
                  ? `opacity-0 translate-x-2 duration-[${LEAVE_MS}ms]`
                  : "opacity-100 translate-x-0 duration-200",
              ].join(" ")}
              style={{
                animation: t.leaving ? undefined : "toastIn 200ms ease-out",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  {t.type === "success" && "✅"}
                  {t.type === "error" && "⛔"}
                  {t.type === "info" && "ℹ️"}
                  {t.type === "warning" && "⚠️"}
                </div>

                <div className="flex-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {t.message}
                </div>

                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="Fechar aviso"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de ToastProvider");
  return ctx;
}