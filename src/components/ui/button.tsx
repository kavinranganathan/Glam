import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-pill transition-colors disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
  secondary: "bg-secondary text-white hover:bg-violet-800",
  outline: "border border-border bg-background text-text hover:bg-surface",
  ghost: "text-text hover:bg-surface",
  danger: "bg-error text-white hover:bg-red-700",
  link: "text-primary underline-offset-4 hover:underline px-0 min-h-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  href?: string;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, href, fullWidth, children, disabled, ...props },
  ref,
) {
  const classes = cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
  if (href) {
    return (
      <Link href={href} className={cn(classes, "btn")} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
