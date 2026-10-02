import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/account/profile-form";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit Profile" };

/** S36 Edit Profile. */
export default async function EditProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/edit");
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">Edit profile</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">Your name appears on reviews (masked) and delivery labels.</p>
      <ProfileForm
        email={user.email ?? user.authEmail}
        initial={{
          name: user.name ?? "",
          phone: user.phone ?? "",
          dob: user.dob ?? "",
          avatarUrl: user.avatar_url ?? "",
          marketingConsent: user.marketing_consent,
        }}
      />
    </div>
  );
}
