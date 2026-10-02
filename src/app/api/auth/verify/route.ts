import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handle, ApiError, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { GUEST_COOKIE } from "@/lib/auth/guest";
import { completeLogin, REF_COOKIE } from "@/lib/auth/post-login";

const Body = z.object({
  email: z.email().trim().toLowerCase(),
  token: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code" }),
  next: z.string().max(500).optional().nullable(),
});

/** Verifies the 6-digit email OTP, establishes the session cookie and finishes login. */
export const POST = handle(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`verify:${ip}`, LIMITS.authPerIpPerMinute * 2, 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
  }
  const body = await parseBody(req, Body);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: body.email, token: body.token, type: "email" });
  if (error || !data.user) {
    throw new ApiError(400, "OTP_INVALID", "That code is incorrect or has expired. Request a new one.");
  }
  const store = await cookies();
  const redirectTo = await completeLogin({
    userId: data.user.id,
    sessionId: store.get(GUEST_COOKIE)?.value ?? null,
    refCode: store.get(REF_COOKIE)?.value ?? null,
    next: body.next ?? null,
  });
  const res = ok({ redirectTo });
  res.cookies.delete(REF_COOKIE);
  return res;
});
