"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

function withinChatHours(now = new Date()): boolean {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  return h >= 10 && h < 19;
}

/** S40 "Live chat (10 AM–7 PM)". Chat is simulated: the message becomes a support ticket. */
export function LiveChatButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const live = withinChatHours();

  const send = async () => {
    setError(null);
    if (!isLoggedIn && !/^\S+@\S+\.\S+$/.test(email)) return setError("Add your email so we can reply.");
    if (message.trim().length < 10) return setError("Write at least 10 characters.");
    setBusy(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "ticket", subject: "Live chat message", message: message.trim(), ...(isLoggedIn ? {} : { email: email.trim() }) }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Could not send");
      toast({ title: "Message sent", description: "An agent will reply by email within 24 hours.", tone: "success" });
      setMessage("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} fullWidth>
        <MessageCircle className="h-4 w-4" aria-hidden /> Live chat (10 AM – 7 PM) {live ? <span className="ml-1 inline-block h-2 w-2 rounded-full bg-success" aria-label="online" /> : <span className="text-text-tertiary">· offline</span>}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Chat with GLAM Care"
        desktop="modal"
        footer={
          <Button onClick={send} loading={busy} fullWidth>
            Send message
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="rounded-card bg-surface p-3 text-sm text-text-secondary">
            Chat is simulated in this build — leave a message and it becomes a support ticket. {live ? "Agents are online now." : "Agents are offline; we reply first thing at 10 AM IST."}
          </p>
          {!isLoggedIn && <Input label="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
          <Textarea label="Your message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Hi! I need help with…" />
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
