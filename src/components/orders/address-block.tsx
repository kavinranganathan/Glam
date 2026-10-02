import type { OrderAddress } from "@/lib/orders/views";

/** Compact postal address used on order detail, confirmation and return pages. */
export function AddressBlock({ address, className }: { address: OrderAddress; className?: string }) {
  const lines = [address.line1, address.line2, address.landmark].filter((l): l is string => Boolean(l && l.trim()));
  const cityLine = [address.city, address.state].filter(Boolean).join(", ") + (address.pincode ? ` – ${address.pincode}` : "");
  return (
    <address className={["not-italic text-sm text-text-secondary leading-6", className ?? ""].join(" ")}>
      {address.name && <span className="block font-semibold text-text">{address.name}</span>}
      {lines.map((l, i) => (
        <span key={i} className="block">
          {l}
        </span>
      ))}
      {cityLine.trim() && <span className="block">{cityLine}</span>}
      {address.phone && <span className="block text-text-tertiary">Phone: {address.phone}</span>}
    </address>
  );
}
