const pkrFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

/** e.g. formatPKR(82500) -> "PKR 82,500" */
export function formatPKR(amount: number): string {
  return `PKR ${pkrFormatter.format(Math.round(amount))}`;
}

/** Renders the dynamic squad price: anchor price minus the discount unlocked at the current member count. */
export function squadCurrentPrice(anchorPrice: number, maxDiscount: number, currentMembers: number, targetMembers: number): number {
  const discount = (currentMembers / targetMembers) * maxDiscount;
  return anchorPrice * (1 - discount);
}

export function hoursUntil(isoDate: string): number {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / (60 * 60 * 1000)));
}
