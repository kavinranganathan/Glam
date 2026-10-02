/**
 * Pure relevance scoring of a product against a beauty profile. Higher is better.
 *
 *  +3   skin type match
 *  +2   per matching concern
 *  +1   price inside the profile's budget band
 *  +0.5 × log10(soldCount + 1)   popularity
 *  +0.5 launched within the last 14 days
 */

export interface ScorableProduct {
  skinTypes: string[];
  concerns: string[];
  /** Paise. */
  price: number;
  soldCount: number;
  launchedAt: string;
}

export interface ScoringProfile {
  skinType: string | null;
  concerns: string[];
  budget: string | null;
}

export const SKIN_TYPE_MATCH = 3;
export const CONCERN_MATCH = 2;
export const BUDGET_MATCH = 1;
export const POPULARITY_WEIGHT = 0.5;
export const NEW_LAUNCH_BONUS = 0.5;
export const NEW_LAUNCH_DAYS = 14;

/** Budget bands in paise: [min, max). `null` max = unbounded. */
const BUDGET_BANDS: Record<string, [number, number | null]> = {
  under_500: [0, 50000],
  "500_1500": [50000, 150000],
  "1500_4000": [150000, 400000],
  "4000_plus": [400000, null],
};

/** Normalise labels so "Dark Spots", "dark-spots" and "dark_spots" compare equal. */
export function normaliseTag(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
}

export function budgetBandFor(price: number): string | null {
  for (const [band, [min, max]] of Object.entries(BUDGET_BANDS)) {
    if (price >= min && (max === null || price < max)) return band;
  }
  return null;
}

export function scoreForProfile(p: ScorableProduct, bp: ScoringProfile | null, now: Date = new Date()): number {
  let score = 0;

  if (bp) {
    if (bp.skinType) {
      const want = normaliseTag(bp.skinType);
      if (p.skinTypes.some((s) => normaliseTag(s) === want)) score += SKIN_TYPE_MATCH;
    }
    if (bp.concerns.length) {
      const have = new Set(p.concerns.map(normaliseTag));
      const wanted = new Set(bp.concerns.map(normaliseTag));
      for (const c of wanted) if (have.has(c)) score += CONCERN_MATCH;
    }
    if (bp.budget && budgetBandFor(p.price) === bp.budget) score += BUDGET_MATCH;
  }

  score += Math.log10(Math.max(0, p.soldCount) + 1) * POPULARITY_WEIGHT;

  const launched = new Date(p.launchedAt).getTime();
  if (Number.isFinite(launched)) {
    const ageMs = now.getTime() - launched;
    if (ageMs >= 0 && ageMs <= NEW_LAUNCH_DAYS * 24 * 60 * 60 * 1000) score += NEW_LAUNCH_BONUS;
  }

  return score;
}
