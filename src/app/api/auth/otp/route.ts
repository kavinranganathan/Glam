import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handle, ApiError, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { env } from "@/lib/env";
import { REF_COOKIE } from "@/lib/auth/post-login";

const Body = z.object({
  email: z.email({ error: "Enter a valid email address" }).trim().toLowerCase(),
  marketingConsent: z.boolean().optional().default(false),
  ref: z.string().trim().max(20).optional().nullable(),
  next: z.string().max(500).optional().nullable(),
});

/** Sends a 6-digit email OTP (and magic link) via Supabase Auth. */
export const POST = handle(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`otp:${ip}`, LIMITS.authPerIpPerMinute, 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
  }
  const body = await parseBody(req, Body);
  const supabase = await createClient();
  const redirect = new URL("/auth/callback", env.siteUrl);
  if (body.next) redirect.searchParams.set("next", body.next);
  const { error } = await supabase.auth.signInWithOtp({
    email: body.email,
    options: {
      emailRedirectTo: redirect.toString(),
      shouldCreateUser: true,
      data: { marketing_consent: body.marketingConsent },
    },
  });
  if (error) {
    const tooMany = /rate limit|too many/i.test(error.message);
    throw new ApiError(tooMany ? 429 : 400, tooMany ? "RATE_LIMITED" : "OTP_SEND_FAILED", tooMany ? "Please wait before requesting another code." : error.message);
  }
  const res = ok({ sent: true });
  if (body.ref) {
    res.cookies.set(REF_COOKIE, body.ref.toUpperCase(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return res as NextResponse;
});
