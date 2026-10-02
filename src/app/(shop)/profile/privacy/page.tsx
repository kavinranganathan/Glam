import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PrivacyActions } from "@/components/account/privacy-actions";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Privacy Settings" };

/** S41 privacy: consent, data download, account deletion (DPDP Act 2023). */
export default async function PrivacyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/privacy");
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Privacy settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Your rights under India&apos;s Digital Personal Data Protection Act, 2023, in one place.</p>
      </div>
      <PrivacyActions marketingConsent={user.marketing_consent} />
      <section className="rounded-card bg-surface p-4 text-sm text-text-secondary" aria-labelledby="dpdp">
        <h2 id="dpdp" className="font-display text-base font-semibold text-text">
          How GLAM handles your data
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>We collect only what is needed to deliver orders, personalise recommendations and run the rewards programme.</li>
          <li>Consent for marketing is separate from the service and can be withdrawn here at any time without affecting your orders.</li>
          <li>Data download requests are fulfilled instantly as a machine-readable JSON file.</li>
          <li>Account deletion removes personal data within 24 hours; order and invoice records are retained anonymised for 8 years as required by tax law.</li>
          <li>Grievance Officer: privacy@glam.example · we respond within 7 days.</li>
        </ul>
        <p className="mt-3">
          Read the full <Link href="/help#privacy" className="font-semibold text-primary">Privacy Policy</Link> and <Link href="/help#terms" className="font-semibold text-primary">Terms of Service</Link>.
        </p>
      </section>
    </div>
  );
}
