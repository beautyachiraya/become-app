/**
 * Package / promo expiry defaults for the future package ledger.
 *
 * Product rule: promo packs expire sooner than paid packs.
 * These numbers are temporary until product confirms final values.
 * Do not build ledger UI against this module yet — config only.
 */
export const PACKAGE_EXPIRY_DAYS = {
  promo: 90,
  paid: 180,
};

export function expiryDaysForPack(kind) {
  if (kind === "promo") return PACKAGE_EXPIRY_DAYS.promo;
  return PACKAGE_EXPIRY_DAYS.paid;
}
