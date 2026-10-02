"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function useLockBody(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function useEscape(active: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

const noopSubscribe = () => () => {};
function useMounted() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** `bottom` on mobile always; on desktop `side` renders a right drawer, `bottom` a centered modal. */
  desktop?: "side" | "modal";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Bottom sheet on mobile, drawer/modal on desktop. */
export function Sheet({ open, onClose, title, children, footer, desktop = "side", size = "md", className }: SheetProps) {
  useLockBody(open);
  useEscape(open, onClose);
  const mounted = useMounted();
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);
  if (!mounted || !open) return null;
  const width = size === "sm" ? "md:max-w-sm" : size === "lg" ? "md:max-w-2xl" : "md:max-w-md";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end" role="presentation">
      <button aria-label="Close" className="absolute inset-0 bg-black/40 min-h-0 cursor-default" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex w-full flex-col bg-background shadow-xl outline-none animate-fade-up",
          "max-h-[92vh] rounded-t-2xl",
          desktop === "side"
            ? cn("md:h-full md:max-h-none md:rounded-none md:w-full", width)
            : cn("md:m-auto md:h-auto md:max-h-[85vh] md:rounded-2xl md:w-full", width),
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-border md:hidden absolute left-1/2 -translate-x-1/2 top-2" aria-hidden />
          <h2 className="font-display text-lg font-semibold mt-2 md:mt-0">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-surface min-h-0 mt-2 md:mt-0">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-border px-4 py-3 pb-safe bg-background">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  useLockBody(open);
  useEscape(open, onClose);
  const mounted = useMounted();
  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button aria-label="Close" className="absolute inset-0 bg-black/40 min-h-0 cursor-default" onClick={onClose} />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl animate-fade-up">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-text-secondary">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {actions && <div className="mt-6 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
