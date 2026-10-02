export interface WishlistItemView {
  id: string;
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  image: string;
  /** Current product price in paise (min variant price). */
  price: number;
  mrp: number;
  priceAtAdd: number;
  /** Current price is at least 10% below the price when the item was added (PRD price-drop badge). */
  priceDropped: boolean;
  inStock: boolean;
  /**
   * In stock now AND the owner has a `stock_alerts` row for any variant of the product
   * (i.e. they asked to be notified while it was out of stock). Simplification documented in rules.ts.
   */
  backInStock: boolean;
  variantId: string | null;
  defaultVariantId: string;
  hasVariants: boolean;
  collectionId: string;
  createdAt: string;
}

export interface WishlistCollectionView {
  id: string;
  name: string;
  isDefault: boolean;
  shareToken: string;
  itemCount: number;
  cover: string | null;
}
