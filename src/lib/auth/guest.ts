import { cookies } from "next/headers";

export const GUEST_COOKIE = "glam_session";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (spec §10)

/**
 * Returns the guest session id. The proxy sets the cookie on first visit, so this is normally present.
 * Falls back to a transient id when the cookie is missing (e.g. cookies disabled).
 */
export async function getGuestSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const fresh = newSessionId();
  try {
    store.set(GUEST_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  } catch {
    // Server Component context: cannot set cookies; the proxy will set one on the next request.
  }
  return fresh;
}

export function newSessionId(): string {
  return crypto.randomUUID();
}
