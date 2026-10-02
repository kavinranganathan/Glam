import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

/** PRD "Zero dead ends": every empty/error state has a next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {icon && <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</div>}
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {action && (
          <Button href={action.href} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {secondary && (
          <Button variant="outline" href={secondary.href} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
      </div>
    </div>
  );
}
