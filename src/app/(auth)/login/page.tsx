import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;
  const ref = typeof sp.ref === "string" ? sp.ref : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <Suspense>
      <LoginForm next={next} refCode={ref} initialError={error === "link" ? "That sign-in link has expired. Enter your email to get a new one." : null} />
    </Suspense>
  );
}
