import { cn } from "@/lib/utils/cn";

export interface KpiTile {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning";
  href?: string;
}

export function KpiTiles({ tiles }: { tiles: KpiTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => {
        const body = (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{t.label}</p>
            <p className={cn("mt-1 font-display text-2xl font-bold tabular-nums", t.tone === "warning" ? "text-warning" : "text-text")}>{t.value}</p>
            {t.hint && <p className="mt-0.5 text-xs text-text-secondary">{t.hint}</p>}
          </>
        );
        const cls = "block rounded-card border border-border bg-background p-4 shadow-card";
        return t.href ? (
          <a key={t.label} href={t.href} className={cn(cls, "hover:bg-surface")}>
            {body}
          </a>
        ) : (
          <div key={t.label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
