import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { GUEST_COOKIE } from "@/lib/auth/guest";
import { completeLogin, REF_COOKIE } from "@/lib/auth/post-login";

/** Magic-link / OAuth landing. Supports PKCE `code` and legacy `token_hash` links. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next");
  const supabase = await createClient();

  let userId: string | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id ?? null;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) userId = data.user?.id ?? null;
  }

  if (!userId) {
    const fail = new URL("/login", url.origin);
    fail.searchParams.set("error", "link");
    if (next) fail.searchParams.set("next", next);
    return NextResponse.redirect(fail);
  }

  const store = await cookies();
  const redirectTo = await completeLogin({
    userId,
    sessionId: store.get(GUEST_COOKIE)?.value ?? null,
    refCode: store.get(REF_COOKIE)?.value ?? null,
    next,
  });
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));
  res.cookies.delete(REF_COOKIE);
  return res;
}
