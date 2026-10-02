import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { VPA_REGEX, cardLabel } from "@/lib/loyalty/rules";
import { serviceClient } from "@/lib/supabase/service";

const CARD_BRANDS = ["Visa", "Mastercard", "RuPay", "Amex"] as const;

/**
 * Only a display label is stored. Real tokenisation would happen with the gateway's
 * client SDK; here we mint a random opaque token so no PAN ever reaches the server.
 */
const BodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("upi"), vpa: z.string().trim().regex(VPA_REGEX, "Enter a valid UPI ID like name@bank") }),
  z.object({
    kind: z.literal("card"),
    brand: z.enum(CARD_BRANDS),
    last4: z.string().regex(/^\d{4}$/, "Last 4 digits only"),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry as MM/YY"),
  }),
]);

export const GET = handle(async () => {
  const user = await requireUser();
  const { data, error } = await serviceClient()
    .from("saved_payment_methods")
    .select("id, kind, label, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ok({ methods: data ?? [] });
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, BodySchema);
  const label = body.kind === "upi" ? body.vpa.toLowerCase() : cardLabel(body.brand, body.last4, body.expiry);
  const { data, error } = await serviceClient()
    .from("saved_payment_methods")
    .insert({ user_id: user.id, kind: body.kind, label, token: `tok_${crypto.randomUUID().replace(/-/g, "")}` })
    .select("id, kind, label, created_at")
    .single();
  if (error) throw error;
  return ok({ method: data }, { status: 201 });
});
