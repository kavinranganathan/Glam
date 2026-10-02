import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { getUser } from "@/lib/auth/session";
import { getGuestSessionId } from "@/lib/auth/guest";
import { serviceClient } from "@/lib/supabase/service";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

const Body = z.object({
  events: z
    .array(
      z.object({
        name: z.enum(ANALYTICS_EVENTS as [string, ...string[]]),
        props: z.record(z.string(), z.unknown()).default({}),
        ts: z.number().optional(),
      }),
    )
    .max(50),
});

export const POST = handle(async (req) => {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return ok({ accepted: 0 });
  }
  const [user, sessionId] = await Promise.all([getUser().catch(() => null), getGuestSessionId()]);
  if (parsed.events.length) {
    await serviceClient()
      .from("analytics_events")
      .insert(
        parsed.events.map((e) => ({
          user_id: user?.id ?? null,
          session_id: sessionId,
          name: e.name,
          props: (e.props ?? {}) as Record<string, string | number | boolean | null>,
          created_at: e.ts ? new Date(e.ts).toISOString() : undefined,
        })),
      );
  }
  return ok({ accepted: parsed.events.length });
});
