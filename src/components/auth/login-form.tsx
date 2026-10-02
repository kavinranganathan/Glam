"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";

type Step = "email" | "otp";

export function LoginForm({ next, refCode, initialError }: { next: string | null; refCode: string | null; initialError: string | null }) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(initialError);
  const [loading, setLoading] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);
  const otpRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, marketingConsent: consent, ref: refCode, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Couldn't send the code.");
        return;
      }
      setStep("otp");
      setResendIn(60);
      setCode("");
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (value: string) => {
    if (value.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: value, next }),
      });
      const data = await res.json();
      if (!res.ok) {
        const n = attempts + 1;
        setAttempts(n);
        setError(n >= 5 ? "Too many incorrect attempts. Request a new code." : (data.error?.message ?? "Incorrect code."));
        setCode("");
        return;
      }
      router.replace(data.redirectTo ?? "/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-card md:p-8">
      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendOtp();
          }}
          className="flex flex-col gap-5"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">Sign in or create account</h1>
            <p className="mt-1 text-sm text-text-secondary">We&apos;ll email you a 6-digit code. No password needed.</p>
          </div>
          <Input
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            leading={<Mail className="h-4 w-4" aria-hidden />}
            error={error ?? undefined}
          />
          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            label={
              <>
                Send me offers, new launches and personalised picks. <span className="text-text-tertiary">(Optional — DPDP Act 2023 consent; change anytime in Settings.)</span>
              </>
            }
          />
          <Button type="submit" size="lg" loading={loading} fullWidth>
            Continue
          </Button>
          {refCode && (
            <p className="rounded-card bg-secondary-soft px-3 py-2 text-sm text-secondary">
              <ShieldCheck className="mr-1 inline h-4 w-4" aria-hidden /> Referral code <b>{refCode}</b> applied — your friend earns points on your first order.
            </p>
          )}
          <p className="text-center text-xs text-text-tertiary">
            By continuing you agree to our{" "}
            <Link href="/help#terms" className="underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/help#privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
          <Link href={next && !next.startsWith("/profile") ? next : "/"} className="text-center text-sm font-semibold text-text-secondary">
            Continue as guest
          </Link>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
          className="flex flex-col gap-5"
        >
          <div>
            <h1 className="font-display text-2xl font-bold">Enter the code</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Sent to <b>{email}</b>.{" "}
              <button type="button" className="font-semibold text-primary min-h-0" onClick={() => setStep("email")}>
                Change
              </button>
            </p>
          </div>
          <Input
            ref={otpRef}
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) void verify(v);
            }}
            placeholder="••••••"
            className="[&_input]:tracking-[0.5em] [&_input]:text-center [&_input]:text-2xl"
            error={error ?? undefined}
            disabled={attempts >= 5}
          />
          <Button type="submit" size="lg" loading={loading} fullWidth disabled={code.length !== 6 || attempts >= 5}>
            Verify
          </Button>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Or tap the sign-in link in the email.</span>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={() => {
                setAttempts(0);
                void sendOtp();
              }}
              className="font-semibold text-primary disabled:text-text-tertiary min-h-0"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
