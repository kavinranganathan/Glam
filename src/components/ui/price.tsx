import { discountPercent, formatINR } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

export function Price({
  price,
  mrp,
  size = "md",
  className,
  showDiscount = true,
}: {
  price: number;
  mrp: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showDiscount?: boolean;
}) {
  const pct = discountPercent(mrp, price);
  const main = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  const sub = size === "lg" ? "text-base" : "text-xs";
  return (
    <div className={cn("flex items-baseline gap-2 flex-wrap", className)}>
      <span className={cn("font-bold text-text", main)}>{formatINR(price)}</span>
      {pct > 0 && (
        <>
          <s className={cn("text-text-tertiary", sub)}>{formatINR(mrp)}</s>
          {showDiscount && pct >= 10 && <span className={cn("font-semibold text-success", sub)}>{pct}% OFF</span>}
        </>
      )}
    </div>
  );
}
