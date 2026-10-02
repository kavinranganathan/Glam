import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  onRemove?: () => void;
  size?: "sm" | "md";
}

/** Selectable pill used for filters, beauty profile answers and variant sizes. */
export function Chip({ selected, onRemove, size = "md", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border font-medium transition-colors",
        size === "sm" ? "h-8 px-3 text-xs min-h-0" : "h-10 px-4 text-sm min-h-0",
        selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-background text-text-secondary hover:border-text-tertiary",
        className,
      )}
      {...props}
    >
      {selected && !onRemove && <Check className="h-3.5 w-3.5" aria-hidden />}
      {children}
      {onRemove && (
        <span
          role="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:bg-primary/10 p-0.5"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </button>
  );
}
