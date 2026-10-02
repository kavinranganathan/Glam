import { pointsForOrder, POINT_VALUE_PAISE, redeemablePoints } from "@/lib/loyalty/points";
import { validateCoupon } from "./coupons";
import { codFee, deliveryFee, FREE_DELIVERY_THRESHOLD } from "./delivery";
import type { PricingContext, PricingLine, PricingLineInput, PricingResult } from "./types";

/** Unit price for a line: flash sale beats Pro price beats base price. */
export function unitPriceFor(line: PricingLineInput, isPro: boolean): { price: number; source: PricingLine["priceSource"] } {
  if (line.flashPrice != null && line.flashPrice < line.price) return { price: line.flashPrice, source: "flash" };
  if (isPro && line.proPrice != null && line.proPrice < line.price) return { price: line.proPrice, source: "pro" };
  return { price: line.price, source: "base" };
}

/** Buy X Get Y on the same line: for every (buy+get) units, `get` units are free. */
export function bxgyDiscount(qty: number, unitPrice: number, buy: number, get: number): { discount: number; freeUnits: number } {
  if (buy <= 0 || get <= 0) return { discount: 0, freeUnits: 0 };
  const groups = Math.floor(qty / (buy + get));
  const freeUnits = groups * get;
  return { discount: freeUnits * unitPrice, freeUnits };
}

export function priceLine(line: PricingLineInput, isPro: boolean): PricingLine {
  const { price, source } = unitPriceFor(line, isPro);
  const gross = price * line.qty;
  const offer = line.offerType === "bxgy" ? bxgyDiscount(line.qty, price, line.offerBuy, line.offerGet) : { discount: 0, freeUnits: 0 };
  return {
    cartItemId: line.cartItemId,
    variantId: line.variantId,
    qty: line.qty,
    unitPrice: price,
    mrp: line.mrp,
    lineTotal: gross - offer.discount,
    lineDiscount: offer.discount,
    priceSource: source,
    offerLabel:
      line.offerType === "bxgy"
        ? offer.freeUnits > 0
          ? `Buy ${line.offerBuy} Get ${line.offerGet} applied · ${offer.freeUnits} free`
          : `Buy ${line.offerBuy} Get ${line.offerGet} Free`
        : null,
  };
}

/**
 * Prices a cart end to end. Pure: no I/O. Order of operations (spec §6):
 * unit price → BxGy → subtotal → coupon → points → delivery → COD fee → tax (inclusive, 0).
 */
export function priceCart(inputs: PricingLineInput[], ctx: PricingContext): PricingResult {
  const lines = inputs.map((l) => priceLine(l, ctx.isPro));
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemDiscount = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const merchandise = subtotal - itemDiscount;

  let couponDiscount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;
  let couponFreeDelivery = false;
  if (ctx.coupon) {
    const enriched = lines.map((l, i) => ({ ...l, brandId: inputs[i].brandId, categoryPath: inputs[i].categoryPath }));
    const v = validateCoupon(ctx.coupon, ctx, enriched);
    if (v.ok) {
      couponDiscount = v.discount;
      couponFreeDelivery = v.freeDelivery;
      couponCode = ctx.coupon.code;
    } else {
      couponError = v.error;
    }
  }

  const afterCoupon = Math.max(0, merchandise - couponDiscount);
  const pointsRedeemed = ctx.usePoints ? redeemablePoints(ctx.pointsBalance, afterCoupon) : 0;
  const pointsDiscount = pointsRedeemed * POINT_VALUE_PAISE;
  const afterPoints = afterCoupon - pointsDiscount;

  const delivery = lines.length === 0 ? { fee: 0, label: "Free", reason: "free_threshold" as const } : deliveryFee(merchandise, ctx.tier, ctx.isPro, ctx.pincode, couponFreeDelivery);
  const cod = lines.length === 0 ? 0 : codFee(ctx.paymentMethod);
  const tax = 0; // prices are inclusive of GST (PRD §8.5.3)
  const total = afterPoints + delivery.fee + cod + tax;

  const mrpTotal = lines.reduce((s, l) => s + l.mrp * l.qty, 0);
  const proSavings = inputs.reduce((s, l, i) => (lines[i].priceSource === "pro" ? s + (l.price - l.proPrice!) * l.qty : s), 0);

  return {
    lines,
    subtotal,
    itemDiscount,
    couponCode,
    couponDiscount,
    couponError,
    pointsRedeemed,
    pointsDiscount,
    deliveryFee: delivery.fee,
    deliveryLabel: delivery.label,
    codFee: cod,
    tax,
    total,
    pointsToEarn: pointsForOrder(afterPoints, ctx.tier),
    totalSavings: Math.max(0, mrpTotal - afterPoints),
    proSavings,
    freeDeliveryGap: delivery.fee > 0 && delivery.reason === "paid" ? Math.max(0, FREE_DELIVERY_THRESHOLD - merchandise) : 0,
  };
}
