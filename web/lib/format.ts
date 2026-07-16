const pkrFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

export function formatPKR(amount: number): string {
  return `PKR ${pkrFormatter.format(Math.round(amount))}`;
}

/**
 * Dynamic squad unit price using the linear step-down formula.
 * maxDiscount is stored as a decimal fraction (e.g. 0.15 = 15%).
 * Clamps at maxDiscount once targetMembers is reached.
 */
export function squadCurrentPrice(
  anchorPrice: number,
  maxDiscount: number,
  currentMembers: number,
  targetMembers: number,
): number {
  if (targetMembers <= 0) return anchorPrice;
  const ratio = Math.min(currentMembers / targetMembers, 1);
  const discount = ratio * maxDiscount; // e.g. 0.10 * 0.15 = 0.015
  return anchorPrice * (1 - discount);
}

/**
 * Returns the integer discount percentage unlocked so far.
 * maxDiscount is a decimal fraction (0–1). Multiplies by 100 to get %.
 * e.g. 3/30 members, maxDiscount=0.15 → Math.round(0.10 * 0.15 * 100) = 2%
 */
export function squadDiscountPercent(
  maxDiscount: number,
  currentMembers: number,
  targetMembers: number,
): number {
  if (targetMembers <= 0) return 0;
  const ratio = Math.min(currentMembers / targetMembers, 1);
  return Math.round(ratio * maxDiscount * 100);
}

/** Max possible discount as integer percent (e.g. 0.15 → 15). */
export function squadMaxDiscountPercent(maxDiscount: number): number {
  return Math.round(maxDiscount * 100);
}

export function hoursUntil(isoDate: string): number {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / (60 * 60 * 1000)));
}
