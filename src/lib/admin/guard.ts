import "server-only";

import { redirect } from "next/navigation";
import { getUser, type Profile } from "@/lib/auth/session";

/**
 * Page-level admin guard: guests go to login (and come back), non-admins go home.
 * Used by the admin layout and every admin page (pages render in parallel with layouts).
 */
export async function requireAdminPage(next = "/admin"): Promise<Profile> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.role !== "admin") redirect("/");
  return user;
}
