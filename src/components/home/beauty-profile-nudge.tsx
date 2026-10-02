import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Slot-3 nudge shown when the viewer has no beauty profile yet (PRD §8.1.4 welcome offer). */
export function BeautyProfileNudge() {
  return (
    <section aria-labelledby="beauty-nudge-title" className="mx-4 my-4 flex items-center gap-4 rounded-card border border-primary/20 bg-primary-soft p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Sparkles className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="beauty-nudge-title" className="font-display text-base font-bold text-text md:text-lg">
          Complete your beauty profile — unlock 15% off
        </h2>
        <p className="text-sm text-text-secondary">Tell us your skin type and concerns to get picks made for you.</p>
      </div>
      <Button href="/profile/beauty" size="sm" className="shrink-0">
        Start
      </Button>
    </section>
  );
}
