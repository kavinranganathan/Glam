import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { deleteAccount } from "@/lib/account/privacy";

const BodySchema = z.object({ confirm: z.literal("DELETE") });

/**
 * DPDP "right to erasure": anonymises the profile, removes personal rows and deletes the auth user.
 * The client then POSTs /auth/signout to clear the session cookie.
 */
export const POST = handle(async (req) => {
  const user = await requireUser();
  await parseBody(req, BodySchema);
  const result = await deleteAccount(user.id);
  return ok({ ...result, redirect: "/auth/signout" });
});
