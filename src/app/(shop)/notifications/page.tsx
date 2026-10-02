import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { NotificationList } from "@/components/account/notification-list";
import { getUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications/service";

export const metadata: Metadata = { title: "Notifications" };

/** S07 notification centre: last 90 days, read/unread, deep links. */
export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/notifications");
  const notifications = await listNotifications(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-text">Notifications</h1>
        <Link href="/profile/notifications" className="inline-flex h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-primary hover:bg-primary-soft" aria-label="Notification settings">
          <Settings2 className="h-4 w-4" aria-hidden /> Settings
        </Link>
      </div>
      <NotificationList initial={notifications} />
    </div>
  );
}
