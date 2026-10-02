import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const GUEST_COOKIE = "glam_session";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30;

// Order detail / confirmation / invoice and return detail do their own ownership check in-page so that
// guest checkouts (session-matched) can see their order; only the account-level lists are gated here.
// /checkout is open to guests (PRD guest checkout); the simulated gateway checks order ownership by session.
const PROTECTED_PREFIXES = ["/profile", "/notifications", "/admin", "/wishlist"];
const PROTECTED_EXACT = ["/orders"];
const PUBLIC_UNDER_PROTECTED = ["/wishlist/s/"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Guest session cookie for carts / recently viewed before login.
  if (!request.cookies.get(GUEST_COOKIE)) {
    const id = crypto.randomUUID();
    request.cookies.set(GUEST_COOKIE, id);
    response = NextResponse.next({ request });
    response.cookies.set(GUEST_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: GUEST_MAX_AGE });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const guest = response.cookies.get(GUEST_COOKIE);
        response = NextResponse.next({ request });
        if (guest) response.cookies.set(GUEST_COOKIE, guest.value, { httpOnly: true, sameSite: "lax", path: "/", maxAge: GUEST_MAX_AGE });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session if needed (writes cookies through setAll above).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isProtected =
    (PROTECTED_EXACT.includes(pathname) || PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) &&
    !PUBLIC_UNDER_PROTECTED.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }
  if (user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next") || "/";
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
