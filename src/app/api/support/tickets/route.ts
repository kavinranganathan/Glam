import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { getUser, requireUser } from "@/lib/auth/session";
import { TicketSchema, createTicket, listTickets } from "@/lib/account/support";

/** The signed-in user's tickets, newest first. */
export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ tickets: await listTickets(user.id) });
});

/** Raise a ticket or request a callback. Guests must include an email so we can reply. */
export const POST = handle(async (req) => {
  const user = await getUser();
  const body = await parseBody(req, TicketSchema);
  if (!user && !body.email) throw new ApiError(422, "EMAIL_REQUIRED", "Add your email so we can get back to you.");
  const ticket = await createTicket(user?.id ?? null, body);
  return ok({ ticket }, { status: 201 });
});
