import type { Metadata } from "next";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { LiveChatButton } from "@/components/account/live-chat";
import { SupportForms } from "@/components/account/support-forms";
import { getUser } from "@/lib/auth/session";
import { listTickets } from "@/lib/account/support";
import { TICKET_STATUS_LABEL } from "@/lib/account/support-constants";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Help & Support" };

const FAQ = [
  { id: "orders", title: "Orders", content: "Track every order from My Orders. You can cancel within 30 minutes of placing it, or any time while it is still being packed. Order numbers look like GLM-20261002-0001." },
  { id: "delivery", title: "Delivery", content: "Standard delivery is free above ₹999 and for Silver tier and above; otherwise the fee depends on your pincode. Same-day is available in metro pincodes for orders before 12 PM IST. GLAM Pro members get free delivery on every order." },
  { id: "returns-faq", title: "Returns & refunds", content: "Beauty products can be returned within 30 days, fashion within 14 and wellness within 7 days of delivery, as long as they are unused and sealed where applicable. Refunds go to your original payment method in 5–7 working days, or instantly to your GLAM wallet." },
  { id: "payments", title: "Payments", content: "We accept UPI, cards, net banking, wallets, EMI, Pay Later and Cash on Delivery (up to ₹20,000, ₹40 fee). Saved cards are tokenised — we never store full card numbers." },
  { id: "pro", title: "GLAM Pro", content: "GLAM Pro costs ₹299 a month and gives free delivery on all orders, 2-hour early access to flash sales, Pro-only prices and monthly exclusive coupons. Extend any time from the Pro page; it stacks with your loyalty tier." },
  { id: "rewards", title: "Rewards & points", content: "Earn 1 point per ₹10 spent (×1.5 Silver, ×2 Gold, ×3 Platinum). 1 point = ₹0.25 at checkout. Points land within 24 hours of delivery and expire 12 months after they are earned. Reviews earn 50 points with a photo, 20 without; referrals earn 200." },
];

/** S40 Help & Support: FAQ, policies, live chat, tickets, callbacks. Public; tickets list for signed-in users. */
export default async function HelpPage() {
  const user = await getUser().catch(() => null);
  const tickets = user ? await listTickets(user.id).catch(() => []) : [];
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Help &amp; Support</h1>
        <p className="mt-1 text-sm text-text-secondary">Answers to common questions, our policies, and ways to reach GLAM Care.</p>
      </div>

      <section aria-labelledby="faq">
        <h2 id="faq" className="mb-2 font-display text-lg font-semibold text-text">
          Frequently asked questions
        </h2>
        <Accordion items={FAQ} defaultOpen={["orders"]} />
      </section>

      <LiveChatButton isLoggedIn={Boolean(user)} />

      <SupportForms isLoggedIn={Boolean(user)} defaultPhone={user?.phone ?? null} />

      {user && (
        <section aria-labelledby="my-tickets" className="rounded-card border border-border">
          <h2 id="my-tickets" className="px-4 pt-4 font-display text-lg font-semibold text-text">
            My tickets
          </h2>
          {tickets.length === 0 ? (
            <p className="px-4 pb-4 pt-2 text-sm text-text-tertiary">No tickets yet. Raise one above and we will reply within 24 hours.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{t.subject}</p>
                    <p className="text-xs text-text-tertiary">
                      {t.kind === "callback" ? "Callback" : "Ticket"} · {formatDateTime(t.created_at)}
                    </p>
                  </div>
                  <Badge tone={t.status === "resolved" ? "success" : t.status === "in_progress" ? "info" : "warning"}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section id="returns" className="scroll-mt-20" aria-labelledby="returns-h">
        <h2 id="returns-h" className="font-display text-lg font-semibold text-text">
          Return &amp; refund policy
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Return windows start on the delivery date: 30 days for beauty, 14 for fashion, 7 for wellness. Items marked non-returnable (opened hygiene products, innerwear, perishables) cannot be returned unless damaged, wrong or defective — attach a photo in those cases. Pickup is free; refunds are issued once the item reaches our warehouse.
        </p>
      </section>

      <section id="privacy" className="scroll-mt-20" aria-labelledby="privacy-h">
        <h2 id="privacy-h" className="font-display text-lg font-semibold text-text">
          Privacy policy
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          GLAM is a data fiduciary under the Digital Personal Data Protection Act, 2023. We process your data to fulfil orders, personalise your feed and operate rewards. Marketing requires separate consent you can withdraw in Privacy Settings, where you can also download or delete your data. We never sell personal data.
        </p>
      </section>

      <section id="terms" className="scroll-mt-20" aria-labelledby="terms-h">
        <h2 id="terms-h" className="font-display text-lg font-semibold text-text">
          Terms of service
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Prices include GST. Offers, coupons and points cannot be exchanged for cash. GLAM may cancel orders affected by pricing errors or suspected fraud with a full refund. Disputes are subject to the courts of Bengaluru, India.
        </p>
      </section>
    </div>
  );
}
