import { handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { listNotifications, markRead } from "@/lib/notifications/service";

/** Last 90 days of notifications, newest first (S07). */
export const GET = handle(async () => {
  const user = await requireUser();
  const notifications = await listNotifications(user.id);
  return ok({ notifications, unread: notifications.filter((n) => !n.read_at).length });
});

/** Mark all as read. */
export const PATCH = handle(async () => {
  const user = await requireUser();
  await markRead(user.id, "all");
  return ok({ read: "all" });
});
