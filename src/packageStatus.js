/**
 * Open vs past mapping for the current treatment-card data model.
 *
 * Treatments are the package unit today (not a future ledger).
 *   remaining  = totalSessions - sessions.length
 *   expired    = expiryDate is in the past
 *   open/Home  = remaining > 0 AND not expired
 *   past       = remaining === 0 (used up) OR expired
 *
 * There is no status / sessionsRemaining field on the document yet.
 * Do not invent a ledger schema here.
 */

export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(date) - start) / 86400000);
}

export function sessionsRemaining(treatment) {
  const total = Number(treatment && treatment.totalSessions) || 0;
  const used = Array.isArray(treatment && treatment.sessions) ? treatment.sessions.length : 0;
  return Math.max(0, total - used);
}

export function isExpiredPack(treatment, now) {
  const left = daysUntil(treatment && treatment.expiryDate, now);
  return left !== null && left < 0;
}

/** Home: still has sessions to use and has not passed expiry. */
export function isOpenPack(treatment, now) {
  return sessionsRemaining(treatment) > 0 && !isExpiredPack(treatment, now);
}

/** Past tab: used-up (0 left) or expired. */
export function isPastPack(treatment, now) {
  return sessionsRemaining(treatment) === 0 || isExpiredPack(treatment, now);
}

/**
 * Needs attention = actionable only (open pack expiring within 30 days).
 * Finished packs (used-up / expired) are never urgent.
 */
export function isNeedsAttention(treatment, now) {
  if (!isOpenPack(treatment, now)) return false;
  const left = daysUntil(treatment && treatment.expiryDate, now);
  return left !== null && left >= 0 && left <= 30;
}

/** Attach packageId (treatment.id) onto each redeemed visit for Past lists. */
export function sessionsWithPackageId(treatment) {
  const packageId = treatment && treatment.id;
  const sessions = Array.isArray(treatment && treatment.sessions) ? treatment.sessions : [];
  return sessions.map((session) => ({ ...session, packageId }));
}
