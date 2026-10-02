"use client";

import * as React from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Toggle } from "@/components/ui/input";
import { Dialog } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

/** S41 consent toggle (PATCH /api/me), data export download, typed-confirmation account deletion. */
export function PrivacyActions({ marketingConsent }: { marketingConsent: boolean }) {
  const { toast } = useToast();
  const [consent, setConsent] = React.useState(marketingConsent);
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const signoutRef = React.useRef<HTMLFormElement>(null);

  const updateConsent = async (next: boolean) => {
    setConsent(next);
    const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marketing_consent: next }) });
    if (!res.ok) {
      setConsent(!next);
      toast({ title: "Could not update consent", tone: "error" });
    } else {
      toast({ title: next ? "Marketing consent given" : "Marketing consent withdrawn", tone: "success" });
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/me/privacy/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Could not delete account");
      toast({ title: "Account deleted", description: "Sorry to see you go.", tone: "success" });
      signoutRef.current?.submit();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not delete account", tone: "error" });
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border border-border px-4" aria-labelledby="consent">
        <h2 id="consent" className="sr-only">
          Consent
        </h2>
        <Toggle checked={consent} onChange={updateConsent} label="Marketing communications" description="Offers, personalised picks and flash sale alerts by email, SMS and push. You can withdraw any time." />
      </section>

      <section className="flex flex-col gap-2 rounded-card border border-border p-4" aria-labelledby="export">
        <h2 id="export" className="font-display text-base font-semibold">
          Download my data
        </h2>
        <p className="text-sm text-text-secondary">A JSON file with your profile, beauty profile, addresses, orders, reviews, points ledger and notifications.</p>
        <Button variant="outline" href="/api/me/privacy/export" className="self-start">
          <Download className="h-4 w-4" aria-hidden /> Download JSON
        </Button>
      </section>

      <section className="flex flex-col gap-2 rounded-card border border-error/40 p-4" aria-labelledby="delete">
        <h2 id="delete" className="font-display text-base font-semibold text-error">
          Delete my account
        </h2>
        <p className="text-sm text-text-secondary">
          Permanently removes your profile, addresses, saved payment methods, beauty profile, wishlists and notifications. Order records are kept anonymised for tax and accounting as the law requires. Unused points and wallet balance are forfeited.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)} className="self-start">
          <Trash2 className="h-4 w-4" aria-hidden /> Delete account
        </Button>
      </section>

      <form ref={signoutRef} method="post" action="/auth/signout" className="hidden" />
      <Dialog
        open={open}
        onClose={() => (deleting ? undefined : setOpen(false))}
        title="Delete your GLAM account?"
        description="This cannot be undone. Type DELETE to confirm."
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={typed !== "DELETE"} loading={deleting}>
              Delete forever
            </Button>
          </>
        }
      >
        <Input label="Type DELETE" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" />
      </Dialog>
    </div>
  );
}
