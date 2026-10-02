import { z } from "zod";
import { ALL_STATUSES } from "@/lib/orders/state-machine";

const uuid = z.string().uuid();
const isoDate = z.string().datetime({ offset: true }).nullable().optional();
const paise = z.number().int().min(0);

export const advanceSchema = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

export const returnAdvanceSchema = z.object({
  status: z.enum(["pickup_scheduled", "picked_up", "received", "refunded", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export const bannerSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).nullable().optional(),
  image_url: z.string().trim().url(),
  cta_label: z.string().trim().min(1).max(40).default("Shop now"),
  href: z.string().trim().min(1).max(300).default("/"),
  position: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
  starts_at: isoDate,
  ends_at: isoDate,
});
export const bannerPatchSchema = bannerSchema.partial();

export const editorialSchema = z.object({
  title: z.string().trim().min(1).max(120),
  excerpt: z.string().trim().max(300).nullable().optional(),
  image_url: z.string().trim().url(),
  href: z.string().trim().min(1).max(300).default("/"),
  position: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});
export const editorialPatchSchema = editorialSchema.partial();

export const flashSaleItemSchema = z.object({ product_id: uuid, sale_price: paise.min(100) });
export const flashSaleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  banner_url: z.string().trim().url().nullable().optional(),
  is_active: z.boolean().default(true),
  items: z.array(flashSaleItemSchema).max(100).default([]),
});
export const flashSalePatchSchema = flashSaleSchema.partial();

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32),
  kind: z.enum(["percent", "flat", "free_delivery"]),
  /** percent (0–100) or paise for flat. */
  value: z.number().int().min(0).default(0),
  max_discount: paise.nullable().optional(),
  min_order: paise.default(0),
  scope: z.enum(["all", "brand", "category"]).default("all"),
  scope_id: uuid.nullable().optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: isoDate,
  usage_limit: z.number().int().min(1).nullable().optional(),
  per_user_limit: z.number().int().min(1).default(1),
  pro_only: z.boolean().default(false),
  is_active: z.boolean().default(true),
  description: z.string().trim().max(200).default(""),
});
export const couponPatchSchema = couponSchema.partial();

export const reviewPatchSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    brandResponse: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.brandResponse !== undefined, { message: "Nothing to update" });

export const qaDeleteSchema = z.object({ kind: z.enum(["question", "answer"]) });

export const variantStockSchema = z.object({ stock: z.number().int().min(0).max(100000) });

export const productPricingSchema = z
  .object({
    price: paise.min(100).optional(),
    mrp: paise.min(100).optional(),
    pro_price: paise.min(100).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const ticketPatchSchema = z.object({ status: z.enum(["open", "in_progress", "resolved"]) });

export type BannerInput = z.infer<typeof bannerSchema>;
export type EditorialInput = z.infer<typeof editorialSchema>;
export type FlashSaleInput = z.infer<typeof flashSaleSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
