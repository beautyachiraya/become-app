/**
 * Package / promo expiry defaults.
 *
 * Product rule: promo packs expire sooner than paid packs.
 * These numbers are temporary until product confirms final values.
 * Used as the default expiry when adding a package if the user does not pick a date.
 */
export const PACKAGE_EXPIRY_DAYS = {
  promo: 90,
  paid: 180,
};

export function expiryDaysForPack(kind) {
  if (kind === "promo") return PACKAGE_EXPIRY_DAYS.promo;
  return PACKAGE_EXPIRY_DAYS.paid;
}
