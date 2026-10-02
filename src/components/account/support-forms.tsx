"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { CALLBACK_SLOTS, CALLBACK_SLOT_LABEL as SLOT_LABEL, type CallbackSlot } from "@/lib/account/support-constants";

type Kind = "ticket" | "callback";

/** S40 "Raise a ticket" and "Request a callback" → POST /api/support/tickets. Guests add an email. */
export function SupportForms({ isLoggedIn, defaultPhone }: { isLoggedIn: boolean; defaultPhone: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [kind, setKind] = React.useState<Kind>("ticket");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState(defaultPhone ?? "");
  const [slot, setSlot] = React.useState<CallbackSlot>("10-12");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (!isLoggedIn && !/^\S+@\S+\.\S+$/.test(email)) return setError("Add your email so we can reply.");
    if (kind === "ticket" && subject.trim().length < 3) return setError("Give your ticket a short subject.");
    if (kind === "ticket" && message.trim().length < 10) return setError("Tell us a little more (at least 10 characters).");
    if (kind === "callback" && !/^[6-9]\d{9}$/.test(phone)) return setError("Enter a 10-digit Indian mobile number.");
    setBusy(true);
    try {
      const body = kind === "ticket" ? { kind, subject: subject.trim(), message: message.trim() } : { kind, phone, slot, message: message.trim() || undefined };
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...(isLoggedIn ? {} : { email: email.trim() }) }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Could not submit");
      toast({ title: kind === "ticket" ? "Ticket raised" : "Callback requested", description: kind === "ticket" ? "We reply within 24 hours." : `We'll call during ${SLOT_LABEL[slot]}.`, tone: "success" });
      setSubject("");
      setMessage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="contact" className="scroll-mt-20 rounded-card border border-border p-4" aria-labelledby="contact-heading">
      <h2 id="contact-heading" className="font-display text-lg font-semibold">
        Contact us
      </h2>
      <Tabs<Kind> className="mt-2" value={kind} onChange={setKind} tabs={[{ value: "ticket", label: "Raise a ticket" }, { value: "callback", label: "Request a callback" }]} />
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4" noValidate>
        {!isLoggedIn && <Input label="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />}
        {kind === "ticket" ? (
          <>
            <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="e.g. Wrong shade delivered" required />
            <Textarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Order number, what happened, what you'd like us to do" required />
          </>
        ) : (
          <>
            <Input label="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" leading={<span className="text-sm">+91</span>} required />
            <Select label="Preferred time (IST)" value={slot} onChange={(e) => setSlot(e.target.value as CallbackSlot)}>
              {CALLBACK_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABEL[s]}
                </option>
              ))}
            </Select>
            <Textarea label="Anything we should know? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} className="[&_textarea]:min-h-20" />
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy}>
          {kind === "ticket" ? "Submit ticket" : "Request callback"}
        </Button>
      </form>
    </section>
  );
}
