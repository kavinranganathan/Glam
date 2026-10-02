"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Accordion({
  items,
  defaultOpen,
  className,
}: {
  items: Array<{ id: string; title: React.ReactNode; content: React.ReactNode; icon?: React.ReactNode }>;
  defaultOpen?: string[];
  className?: string;
}) {
  const [open, setOpen] = React.useState<Set<string>>(new Set(defaultOpen ?? []));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`acc-${item.id}`}
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between gap-3 py-4 text-left font-semibold text-text"
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.title}
              </span>
              <ChevronDown className={cn("h-5 w-5 text-text-tertiary transition-transform", isOpen && "rotate-180")} aria-hidden />
            </button>
            {isOpen && (
              <div id={`acc-${item.id}`} className="pb-4 text-sm text-text-secondary animate-fade-up">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
