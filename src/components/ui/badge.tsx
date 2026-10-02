import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "primary" | "secondary" | "success" | "warning" | "error" | "info" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-text-secondary border border-border",
  primary: "bg-primary-soft text-primary",
  secondary: "bg-secondary-soft text-secondary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
  info: "bg-info-soft text-info",
  dark: "bg-text text-white",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold leading-5", tones[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}

/** Small count bubble for nav icons. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center",
        className,
      )}
      aria-label={`${count} items`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="info" className={className}>
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M10 1.5l2.1 1.6 2.6-.3 1 2.4 2.3 1.3-.6 2.6.6 2.6-2.3 1.3-1 2.4-2.6-.3L10 18.5l-2.1-1.6-2.6.3-1-2.4L2 13.5l.6-2.6L2 8.3l2.3-1.3 1-2.4 2.6.3L10 1.5zm-1 11.2l5-5-1.4-1.4L9 9.9 7.4 8.3 6 9.7l3 3z" />
      </svg>
      Verified
    </Badge>
  );
}
