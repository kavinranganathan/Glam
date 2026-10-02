/**
 * All monetary values in GLAM are integer paise (1/100 rupee).
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const inrFormatterWithPaise = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format paise as an INR string, e.g. 129900 → "₹1,299". */
export function formatINR(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = abs / 100;
  if (abs % 100 === 0) {
    return `${sign}₹${inrFormatter.format(rupees)}`;
  }
  return `${sign}₹${inrFormatterWithPaise.format(rupees)}`;
}

/** Convert rupees to paise, rounding to the nearest paisa. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Percentage discount between MRP and price, rounded to an integer. 0 when there is no discount. */
export function discountPercent(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Round a paise amount to the nearest rupee (multiple of 100). */
export function roundToRupee(paise: number): number {
  return Math.round(paise / 100) * 100;
}
