export type CategoryRoot = "beauty" | "fashion" | "wellness";

/** Return windows per PRD §8.9: 30 days beauty, 14 fashion, 7 wellness. */
export function returnWindowDays(root: CategoryRoot): number {
  switch (root) {
    case "fashion":
      return 14;
    case "wellness":
      return 7;
    default:
      return 30;
  }
}

export const RETURN_REASONS = [
  "Wrong item",
  "Damaged",
  "Defective",
  "Not as described",
  "Changed mind",
  "Allergic reaction",
] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

/** Photo proof is mandatory for damaged, wrong and defective items. */
export function photoRequired(reason: string): boolean {
  return reason === "Damaged" || reason === "Wrong item" || reason === "Defective";
}

export function returnDeadline(deliveredAt: Date, windowDays: number): Date {
  return new Date(deliveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000);
}

export function isReturnable(deliveredAt: Date | null, now: Date, windowDays: number, nonReturnable: boolean): boolean {
  if (nonReturnable || !deliveredAt) return false;
  return now.getTime() <= returnDeadline(deliveredAt, windowDays).getTime();
}

export const RETURN_STATUS_LABEL: Record<string, string> = {
  requested: "Return Requested",
  pickup_scheduled: "Pickup Scheduled",
  picked_up: "Picked Up",
  received: "Received at Warehouse",
  refunded: "Refund Processed",
  rejected: "Return Rejected",
};

export const RETURN_HAPPY_PATH = ["requested", "pickup_scheduled", "picked_up", "received", "refunded"] as const;

export function refundEta(method: "original" | "wallet", paymentMethod: string): string {
  if (method === "wallet") return "Instant to GLAM wallet";
  if (paymentMethod === "cod") return "NEFT to your bank account within 7 days";
  return "5–7 business days to original payment method";
}
