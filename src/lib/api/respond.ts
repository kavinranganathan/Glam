import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/**
 * Wraps a route handler, translating ApiError / ZodError / Postgres business exceptions
 * into `{ error: { code, message } }` responses.
 */
export function handle<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ApiError) {
    return err(e.code, e.message, e.status, e.details);
  }
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return err("VALIDATION", first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", 422, e.issues);
  }
  const message = e instanceof Error ? e.message : String(e);
  const business = mapDbError(message);
  if (business) return err(business.code, business.message, business.status);
  console.error("[api] unhandled error", e);
  return err("INTERNAL", "Something went wrong. Please try again.", 500);
}

/** Maps `raise exception 'CODE:detail'` messages from Postgres functions to user-facing errors. */
export function mapDbError(message: string): { code: string; message: string; status: number } | null {
  const m = message.match(/(^|\s)([A-Z_]{4,})(?::([^\n]+))?/);
  if (!m) return null;
  const code = m[2];
  const detail = m[3]?.trim();
  const table: Record<string, [string, number]> = {
    OUT_OF_STOCK: [`Sorry, ${detail ?? "an item"} just went out of stock. Please update your bag.`, 409],
    COD_LIMIT: ["Cash on Delivery is available for orders up to ₹20,000. Please choose another payment method.", 400],
    EMPTY_ORDER: ["Your bag is empty.", 400],
    VARIANT_NOT_FOUND: ["One of the items is no longer available.", 404],
    ORDER_NOT_FOUND: ["Order not found.", 404],
    CANCEL_NOT_ALLOWED: ["This order can no longer be cancelled.", 409],
    TRANSITION_NOT_ALLOWED: ["That status change is not allowed.", 409],
    RETURN_NOT_ALLOWED: ["Returns are only available for delivered orders.", 409],
    RETURN_WINDOW_CLOSED: [`The return window has closed for ${detail ?? "this item"}.`, 409],
    NON_RETURNABLE: [`${detail ?? "This item"} is not eligible for return.`, 409],
    QTY_EXCEEDS: ["Return quantity exceeds what was ordered.", 400],
    ITEM_NOT_FOUND: ["Item not found.", 404],
    FORBIDDEN: ["You do not have access to this resource.", 403],
    NOT_DELIVERED: ["You can review a product once it has been delivered.", 409],
    REVIEW_TOO_EARLY: ["Reviews open 24 hours after delivery.", 409],
    REVIEW_WINDOW_CLOSED: ["Reviews can be written up to 90 days after delivery.", 409],
    ALREADY_REVIEWED: ["You have already reviewed this item.", 409],
    BODY_TOO_SHORT: ["Please write at least 30 characters.", 422],
    USER_NOT_FOUND: ["Account not found.", 404],
  };
  const hit = table[code];
  return hit ? { code, message: hit[0], status: hit[1] } : null;
}
