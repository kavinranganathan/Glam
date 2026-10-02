import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";
import { BeautyProfileForm } from "@/components/account/beauty-profile-form";

export const metadata: Metadata = { title: "Beauty Profile" };

export default async function BeautyProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/beauty");
  const sp = await searchParams;
  const { data } = await serviceClient().from("beauty_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BeautyProfileForm
        welcome={sp.welcome === "1"}
        next={typeof sp.next === "string" ? sp.next : null}
        userName={user.name}
        initial={
          data
            ? {
                skinType: data.skin_type,
                skinTone: data.skin_tone,
                concerns: data.concerns,
                hairType: data.hair_type,
                shoppingFor: data.shopping_for,
                stylePrefs: data.style_prefs,
                budget: data.budget,
              }
            : null
        }
      />
    </div>
  );
}
