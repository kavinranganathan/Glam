"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

/** Web Share API with clipboard fallback (PRD §8.5.2). */
export function ShareButton({ title, text, path, className }: { title: string; text?: string; path?: string; className?: string }) {
  const { toast } = useToast();
  const share = async () => {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Share it with your friends.", tone: "success" });
    } catch {
      toast({ title: "Couldn't copy the link", description: url, tone: "error" });
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this product"
      className={cn("inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-text-secondary shadow-sm hover:bg-white", className)}
    >
      <Share2 className="h-5 w-5" aria-hidden />
    </button>
  );
}
