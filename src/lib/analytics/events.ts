/** PRD §10.2 core event taxonomy. */
export type AnalyticsEvent =
  | "app_open"
  | "screen_view"
  | "search_performed"
  | "filter_applied"
  | "product_card_viewed"
  | "product_detail_viewed"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_started"
  | "payment_initiated"
  | "purchase"
  | "wishlist_add"
  | "review_submitted"
  | "coupon_applied"
  | "return_initiated"
  | "notification_received"
  | "notification_clicked";

export const ANALYTICS_EVENTS: AnalyticsEvent[] = [
  "app_open",
  "screen_view",
  "search_performed",
  "filter_applied",
  "product_card_viewed",
  "product_detail_viewed",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "payment_initiated",
  "purchase",
  "wishlist_add",
  "review_submitted",
  "coupon_applied",
  "return_initiated",
  "notification_received",
  "notification_clicked",
];

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined | Array<string | number>>;
