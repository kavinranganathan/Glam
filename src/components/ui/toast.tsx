"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "success" | "error" | "info" | "warning";
export interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  action?: { label: string; href?: string; onClick?: () => void };
  durationMs?: number;
}
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = React.createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Allow usage outside the provider (e.g. tests) without crashing.
    return { toast: (t: ToastInput) => console.info("[toast]", t.title) };
  }
  return ctx;
}

const icons: Record<Tone, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-error" aria-hidden />,
  warning: <TriangleAlert className="h-5 w-5 text-warning" aria-hidden />,
  info: <Info className="h-5 w-5 text-info" aria-hidden />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);
  const remove = React.useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);
  const toast = React.useCallback(
    (t: ToastInput) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => remove(id), t.durationMs ?? 3500);
    },
    [remove],
  );
  const value = React.useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-6 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-background p-3 shadow-lg animate-fade-up",
            )}
          >
            {icons[t.tone ?? "info"]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">{t.title}</p>
              {t.description && <p className="text-sm text-text-secondary">{t.description}</p>}
              {t.action && (
                <a
                  href={t.action.href}
                  onClick={(e) => {
                    if (t.action?.onClick) {
                      e.preventDefault();
                      t.action.onClick();
                    }
                    remove(t.id);
                  }}
                  className="mt-1 inline-block text-sm font-semibold text-primary"
                >
                  {t.action.label}
                </a>
              )}
            </div>
            <button onClick={() => remove(t.id)} aria-label="Dismiss" className="rounded p-1 min-h-0 text-text-tertiary hover:bg-surface">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
