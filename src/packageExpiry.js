/**
 * Package / promo expiry defaults for the future package ledger.
 *
 * Product rule: promo packs expire sooner than paid packs.
 * These numbers are temporary until product confirms final values.
 * Used when adding a package if the expiry date is left blank.
 */
export const PACKAGE_EXPIRY_DAYS = {
  promo: 90,
  paid: 180,
};

export function expiryDaysForPack(kind) {
  if (kind === "promo") return PACKAGE_EXPIRY_DAYS.promo;
  return PACKAGE_EXPIRY_DAYS.paid;
}
