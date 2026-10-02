"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ value: T; label: React.ReactNode; count?: number }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto scrollbar-none border-b border-border", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "text-primary" : "text-text-tertiary hover:text-text",
            )}
          >
            {t.label}
            {typeof t.count === "number" && <span className="ml-1 text-xs text-text-tertiary">({t.count})</span>}
            {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
