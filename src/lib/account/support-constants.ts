/** Shared between the server-only support service and the client support forms. */
export const CALLBACK_SLOTS = ["10-12", "12-2", "2-4", "4-7"] as const;
export type CallbackSlot = (typeof CALLBACK_SLOTS)[number];

export const CALLBACK_SLOT_LABEL: Record<CallbackSlot, string> = {
  "10-12": "10 AM – 12 PM",
  "12-2": "12 PM – 2 PM",
  "2-4": "2 PM – 4 PM",
  "4-7": "4 PM – 7 PM",
};

export const TICKET_STATUS_LABEL: Record<"open" | "in_progress" | "resolved", string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
