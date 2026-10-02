import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";

export function PlaceOrderBar({
  total,
  disabled,
  loading,
  issue,
  onPlace,
  inline,
  label = "Place order",
}: {
  total: number;
  disabled?: boolean;
  loading?: boolean;
  /** Why ordering is blocked right now (shown under the button). */
  issue?: string | null;
  onPlace: () => void;
  /** In-flow (desktop summary) rather than fixed to the bottom of the viewport. */
  inline?: boolean;
  label?: string;
}) {
  return (
    <div className={cn(inline ? "" : "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-safe backdrop-blur lg:hidden")}>
      <div className={cn("mx-auto flex max-w-6xl items-center gap-3", inline && "flex-col items-stretch")}>
        {!inline && (
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">Total</p>
            <p className="font-display text-lg font-bold tabular-nums">{formatINR(total)}</p>
          </div>
        )}
        <Button size="lg" fullWidth={inline} className={cn(!inline && "ml-auto flex-1")} disabled={disabled} loading={loading} onClick={onPlace}>
          <Lock className="h-4 w-4" aria-hidden /> {label} · {formatINR(total)}
        </Button>
      </div>
      {issue && (
        <p className={cn("mt-2 text-xs text-error", !inline && "mx-auto max-w-6xl")} role="alert">
          {issue}
        </p>
      )}
    </div>
  );
}
