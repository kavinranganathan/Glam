/** Mask a reviewer's name per PRD §8.5.8: "Priya" → "P***a". */
export function maskName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "GLAM Member";
  const first = trimmed.split(/\s+/)[0];
  if (first.length <= 2) return `${first[0]}***`;
  return `${first[0]}***${first[first.length - 1]}`;
}

/** Mask an email: "priya.s@example.com" → "p***s@example.com". */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/** Mask a card number down to its last 4 digits. */
export function maskCard(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}
