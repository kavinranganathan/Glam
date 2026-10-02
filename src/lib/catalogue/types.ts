/**
 * View models for the catalogue layer. Money is integer paise throughout.
 */

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  brand: { id: string; slug: string; name: string };
  image: string;
  price: number;
  mrp: number;
  proPrice: number | null;
  flashPrice: number | null;
  discountPct: number;
  ratingAvg: number;
  ratingCount: number;
  badges: Array<"best_seller" | "new" | "limited" | "sponsored">;
  offerLabel: string | null;
  inStock: boolean;
  lowStock: boolean;
  hasVariants: boolean;
  defaultVariantId: string;
  categoryId: string;
}

export interface VariantView {
  id: string;
  sku: string;
  name: string;
  kind: "default" | "shade" | "size";
  shadeHex: string | null;
  price: number;
  mrp: number;
  stock: number;
  isDefault: boolean;
}

export interface ProductDetail extends ProductCard {
  description: string;
  benefits: string[];
  ingredients: string[];
  flaggedIngredients: string[];
  howToUse: string[];
  certifications: string[];
  skinTypes: string[];
  concerns: string[];
  freeFrom: string[];
  finish: string | null;
  images: string[];
  videoUrl: string | null;
  variants: VariantView[];
  brandAbout: string | null;
  brandLogo: string | null;
  brandVerified: boolean;
  nonReturnable: boolean;
  offerType: "none" | "bxgy";
  offerBuy: number;
  offerGet: number;
  soldCount: number;
  launchedAt: string;
  category: {
    id: string;
    slug: string;
    name: string;
    root: "beauty" | "fashion" | "wellness";
    returnWindowDays: number;
  };
  /** Leaf first, root last. */
  categoryPath: Array<{ id: string; slug: string; name: string }>;
}

export type SortKey = "relevance" | "popularity" | "price_asc" | "price_desc" | "discount" | "rating" | "newest";

export interface ListFilters {
  q?: string;
  /** Category slug. */
  category?: string;
  /** Brand slugs. */
  brands?: string[];
  /** Paise. */
  priceMin?: number;
  priceMax?: number;
  /** 10 | 20 | 30 | 50 | 70 */
  discount?: number;
  /** 3 | 4 */
  rating?: number;
  skinTypes?: string[];
  concerns?: string[];
  freeFrom?: string[];
  finish?: string[];
  sizes?: string[];
  inStock?: boolean;
  delivery?: "same_day" | "next_day" | "standard";
  offer?: Array<"on_sale" | "bxgy" | "flash">;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  pincode?: string;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  hex?: string;
}

export interface Facets {
  brands: FacetOption[];
  skinTypes: FacetOption[];
  concerns: FacetOption[];
  freeFrom: FacetOption[];
  finish: FacetOption[];
  sizes: FacetOption[];
  priceRange: { min: number; max: number };
}

export interface ListResult {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  facets: Facets;
}

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  root: string;
  returnWindowDays: number;
  children: CategoryNode[];
}

export interface BrandView {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  tagline: string | null;
  about: string | null;
  verified: boolean;
  tier: number;
  socials: Record<string, string>;
  certifications: string[];
  followerCount: number;
}

export interface Shelf {
  key: string;
  title: string;
  subtitle?: string;
  href?: string;
  items: ProductCard[];
}

export interface BannerView {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string;
  href: string;
}

export interface EditorialView {
  id: string;
  title: string;
  excerpt: string | null;
  imageUrl: string;
  href: string;
}

export interface FlashSaleView {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  bannerUrl: string | null;
  items: ProductCard[];
}
