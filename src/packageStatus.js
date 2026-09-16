/**
 * Open vs finished mapping for the current treatment-card data model.
 *
 * Treatments are the package unit today (not a separate packages collection).
 *   remaining  = totalSessions - sessions.length
 *   expired    = expiryDate is in the past
 *   open/Home  = remaining > 0 AND not expired
 *   History    = remaining === 0 (used_up) OR expired
 *
 * There is no required status / sessionsRemaining field on the document yet.
 * Display derives status so used_up and expired packs stay in History (never deleted).
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

/** History package rows: used-up (0 left) or expired. Never listed as active remaining. */
export function isFinishedPack(treatment, now) {
  return sessionsRemaining(treatment) === 0 || isExpiredPack(treatment, now);
}

/**
 * Preferred status values: active | used_up | expired.
 * used_up wins when remaining is 0, even if expiry has also passed.
 */
export function packStatus(treatment, now) {
  if (sessionsRemaining(treatment) === 0) return "used_up";
  if (isExpiredPack(treatment, now)) return "expired";
  return "active";
}

export function packSource(record) {
  const source = record && (record.sourceAtUse || record.source);
  return source === "promo" ? "promo" : "paid";
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

/** Attach packageId (treatment.id) onto each redeemed visit. Display-time only. */
export function sessionsWithPackageId(treatment) {
  const packageId = treatment && treatment.id;
  const sessions = Array.isArray(treatment && treatment.sessions) ? treatment.sessions : [];
  return sessions.map((session) => ({ ...session, packageId }));
}

/** Home list: open packs, soonest expiry first. Missing expiry sorts last. */
export function sortOpenPacks(treatments, now) {
  const list = Array.isArray(treatments) ? treatments.filter((t) => isOpenPack(t, now)) : [];
  return list.slice().sort((a, b) => {
    const ae = a && a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    const be = b && b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    if (ae !== be) return ae - be;
    const idA = a && a.id != null ? String(a.id) : "";
    const idB = b && b.id != null ? String(b.id) : "";
    return idA.localeCompare(idB);
  });
}
