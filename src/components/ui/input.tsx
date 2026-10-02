import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, leading, trailing, id, ...props },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-input border bg-background px-3 h-11 focus-within:ring-2 focus-within:ring-primary/40",
          error ? "border-error" : "border-border",
        )}
      >
        {leading && <span className="text-text-tertiary shrink-0">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="flex-1 min-w-0 bg-transparent outline-none text-base placeholder:text-text-tertiary"
          {...props}
        />
        {trailing && <span className="text-text-tertiary shrink-0">{trailing}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, ...props },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          "rounded-input border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary/40 min-h-28",
          error ? "border-error" : "border-border",
        )}
        {...props}
      />
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, error, id, children, ...props },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={cn(
          "h-11 rounded-input border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary/40",
          error ? "border-error" : "border-border",
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export function Checkbox({
  label,
  className,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("flex items-start gap-3 cursor-pointer text-sm text-text-secondary", className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-5 w-5 min-h-0 shrink-0 rounded border-border accent-primary"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-medium text-text">{label}</span>
        {description && <span className="block text-sm text-text-tertiary">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );
}
