import "server-only";

import { handle } from "@/lib/api/respond";
import { requireAdmin } from "@/lib/auth/session";

export type IdCtx = { params: Promise<{ id: string }> };

/** `handle()` that always runs `requireAdmin()` before the handler body. */
export function adminHandle<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return handle<Ctx>(async (req, ctx) => {
    await requireAdmin();
    return fn(req, ctx);
  });
}
