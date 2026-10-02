export type OrderStatus =
  | "placed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "cancelled"
  | "return_initiated"
  | "returned"
  | "refunded";

export type OrderAction = "cancel" | "track" | "return" | "review" | "reorder" | "reschedule" | "view_refund" | "invoice";

/** Allowed transitions (mirrors `order_status_allowed` in supabase/migrations/0003_functions.sql). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "failed_delivery", "cancelled"],
  out_for_delivery: ["delivered", "failed_delivery"],
  failed_delivery: ["out_for_delivery", "cancelled"],
  delivered: ["return_initiated"],
  return_initiated: ["returned", "delivered"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

/** Consumer-facing labels (PRD §8.8.1). */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Confirmed",
  processing: "Packing in Progress",
  shipped: "On Its Way",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed_delivery: "Delivery Attempted",
  cancelled: "Cancelled",
  return_initiated: "Return Requested",
  returned: "Return Complete",
  refunded: "Refund Processed",
};

export const STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  placed: "info",
  processing: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  failed_delivery: "warning",
  cancelled: "error",
  return_initiated: "warning",
  returned: "neutral",
  refunded: "success",
};

/** Happy-path order used to render the progress timeline. */
export const HAPPY_PATH: OrderStatus[] = ["placed", "processing", "shipped", "out_for_delivery", "delivered"];

export const ALL_STATUSES: OrderStatus[] = Object.keys(TRANSITIONS) as OrderStatus[];

export const CANCEL_WINDOW_MINUTES = 30;

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Users may cancel within 30 minutes of placing, or while the seller is still packing. */
export function canCancel(status: OrderStatus, placedAt: Date, now: Date = new Date()): boolean {
  if (status === "processing") return true;
  if (status !== "placed") return false;
  return now.getTime() - placedAt.getTime() <= CANCEL_WINDOW_MINUTES * 60 * 1000;
}

export function availableActions(status: OrderStatus, placedAt: Date, now: Date = new Date()): OrderAction[] {
  const actions: OrderAction[] = [];
  if (canCancel(status, placedAt, now)) actions.push("cancel");
  switch (status) {
    case "placed":
    case "processing":
      actions.push("invoice");
      break;
    case "shipped":
    case "out_for_delivery":
      actions.push("track", "invoice");
      break;
    case "delivered":
      actions.push("return", "review", "reorder", "invoice");
      break;
    case "failed_delivery":
      actions.push("reschedule", "track");
      break;
    case "cancelled":
      actions.push("reorder", "view_refund");
      break;
    case "return_initiated":
    case "returned":
      actions.push("track", "reorder", "invoice");
      break;
    case "refunded":
      actions.push("view_refund", "reorder", "invoice");
      break;
  }
  return actions;
}

export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Index of a status on the happy path; -1 for exceptional states. */
export function happyPathIndex(status: OrderStatus): number {
  if (status === "return_initiated" || status === "returned" || status === "refunded") return HAPPY_PATH.length - 1;
  return HAPPY_PATH.indexOf(status);
}
