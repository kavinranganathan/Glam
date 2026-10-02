import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <Link href="/" aria-label="GLAM home" className={cn("font-display font-extrabold tracking-tight text-primary", text, className)}>
      GLAM
      <span className="text-secondary">.</span>
    </Link>
  );
}
