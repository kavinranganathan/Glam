import { handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { markRead } from "@/lib/notifications/service";

export const PATCH = handle<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await markRead(user.id, [id]);
  return ok({ read: [id] });
});
