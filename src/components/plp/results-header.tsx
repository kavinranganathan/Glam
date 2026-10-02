import { formatCount } from "./params";

/**
 * PLP / search H1. With `query`: "2,341 results for ‘vitamin c serum’".
 * With `title`: "Serums (1,243)".
 */
export function ResultsHeader({ total, query, title, subtitle }: { total: number; query?: string; title?: string; subtitle?: string }) {
  const count = formatCount(total);
  return (
    <div className="py-3">
      <h1 className="font-display text-xl font-bold text-text md:text-2xl">
        {title ? (
          <>
            {title} <span className="font-normal text-text-tertiary">({count})</span>
          </>
        ) : query ? (
          <>
            {count} {total === 1 ? "result" : "results"} for <span className="text-primary">‘{query}’</span>
          </>
        ) : (
          <>{count} products</>
        )}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-text-tertiary">{subtitle}</p>}
    </div>
  );
}
