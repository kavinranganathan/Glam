import { z } from "zod";

export const SKIN_TYPES = [
  { value: "oily", label: "Oily" },
  { value: "dry", label: "Dry" },
  { value: "combination", label: "Combination" },
  { value: "normal", label: "Normal" },
  { value: "sensitive", label: "Sensitive" },
] as const;

/** 12 Fitzpatrick-calibrated tone swatches, fair → deep. */
export const SKIN_TONES = [
  "#f7e3d6", "#f3d6c3", "#edc8ad", "#e4b897", "#d9a67f", "#c9916a",
  "#b97d58", "#a66a47", "#8f5738", "#75452c", "#5c3521", "#432617",
];

export const CONCERNS = ["Acne", "Anti-aging", "Brightening", "Hydration", "Dark Spots", "Pores"] as const;
export const HAIR_TYPES = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
  { value: "coily", label: "Coily" },
] as const;
export const SHOPPING_FOR = ["Myself", "Partner", "Kids", "Gifts"] as const;
export const STYLE_PREFS = ["Minimalist", "Maximalist", "Natural", "Glam", "Streetwear", "Ethnic"] as const;
export const BUDGETS = [
  { value: "under_500", label: "Under ₹500" },
  { value: "500_1500", label: "₹500–1,500" },
  { value: "1500_4000", label: "₹1,500–4,000" },
  { value: "4000_plus", label: "₹4,000+" },
] as const;

export const BeautyProfileSchema = z.object({
  skinType: z.enum(["oily", "dry", "combination", "normal", "sensitive"]).nullable().optional(),
  skinTone: z.number().int().min(1).max(12).nullable().optional(),
  concerns: z.array(z.string()).max(6).optional().default([]),
  hairType: z.enum(["straight", "wavy", "curly", "coily"]).nullable().optional(),
  shoppingFor: z.array(z.string()).max(4).optional().default([]),
  stylePrefs: z.array(z.string()).max(3).optional().default([]),
  budget: z.enum(["under_500", "500_1500", "1500_4000", "4000_plus"]).nullable().optional(),
});
export type BeautyProfileInput = z.infer<typeof BeautyProfileSchema>;

/** Completion percentage across the 7 questions. */
export function profileCompletion(p: BeautyProfileInput): number {
  const answered = [
    Boolean(p.skinType),
    Boolean(p.skinTone),
    (p.concerns?.length ?? 0) > 0,
    Boolean(p.hairType),
    (p.shoppingFor?.length ?? 0) > 0,
    (p.stylePrefs?.length ?? 0) > 0,
    Boolean(p.budget),
  ].filter(Boolean).length;
  return Math.round((answered / 7) * 100);
}
