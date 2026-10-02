import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrefsForm } from "@/components/account/prefs-form";
import { getUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Notification Settings" };

/** S42 notification preferences. */
export default async function NotificationPrefsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/notifications");
  const { data } = await serviceClient().from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">Notification settings</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">Choose what we send by push, email and SMS.</p>
      <PrefsForm
        initial={{
          orders: true,
          offers: data?.offers ?? true,
          reviews: data?.reviews ?? true,
          loyalty: data?.loyalty ?? true,
          personalised: data?.personalised ?? true,
        }}
      />
    </div>
  );
}
