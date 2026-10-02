import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { pincodeQuote } from "@/lib/pincode/service";

type Ctx = { params: Promise<{ pincode: string }> };

const pincodeSchema = z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode");

export const GET = handle<Ctx>(async (_req, ctx) => {
  const { pincode } = await ctx.params;
  const parsed = pincodeSchema.safeParse(pincode);
  if (!parsed.success) throw new ApiError(422, "VALIDATION", "Enter a valid 6-digit pincode.");
  const quote = await pincodeQuote(parsed.data);
  if (!quote) throw new ApiError(404, "NOT_SERVICEABLE", "Sorry, we don't deliver to this pincode yet.");
  return ok(quote);
});
