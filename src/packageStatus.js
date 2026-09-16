/**
 * Open vs history mapping for the current treatment-card data model.
 *
 * Treatments are the package unit today (not a future ledger).
 *   remaining  = totalSessions - sessions.length
 *   expired    = expiryDate is in the past
 *   open/Home  = remaining > 0 AND not expired
 *   history    = remaining === 0 (used up) OR expired
 *   kind       = treatment.kind "promo" | "paid" (missing → paid)
 *
 * Promo and paid packs stay separate cards / timeline rows.
 * Never sum remaining across kinds.
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

/** History: used-up (0 left) or expired. */
export function isHistoryPack(treatment, now) {
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

/** Attach packageId (treatment.id) onto each redeemed visit. */
export function sessionsWithPackageId(treatment) {
  const packageId = treatment && treatment.id;
  const sessions = Array.isArray(treatment && treatment.sessions) ? treatment.sessions : [];
  return sessions.map((session) => ({ ...session, packageId }));
}

/** Missing kind is paid so existing treatments still badge, and promo never collapses into paid. */
export function packKind(treatment) {
  return treatment && treatment.kind === "promo" ? "promo" : "paid";
}

/** Soonest expiry first; packs with no expiry date sink to the end. */
export function compareExpirySoonest(a, b) {
  const aMissing = !a || !a.expiryDate;
  const bMissing = !b || !b.expiryDate;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return new Date(a.expiryDate) - new Date(b.expiryDate);
}

export function lastSessionDate(treatment) {
  const sessions = Array.isArray(treatment && treatment.sessions) ? treatment.sessions : [];
  let latest = null;
  sessions.forEach((session) => {
    if (!session || !session.date) return;
    if (!latest || new Date(session.date) > new Date(latest)) latest = session.date;
  });
  return latest;
}

export function packHistoryDate(treatment, now) {
  const last = lastSessionDate(treatment);
  const expiry = treatment && treatment.expiryDate;
  const usedUp = sessionsRemaining(treatment) === 0;
  const expired = isExpiredPack(treatment, now);
  if (usedUp && last && expired && expiry) {
    return new Date(last) >= new Date(expiry) ? last : expiry;
  }
  if (usedUp) return last || expiry || "";
  if (expired) return expiry || last || "";
  return last || expiry || "";
}

/**
 * Mixed History timeline: finished packs + their completed sessions, newest first.
 * Each row keeps packageId and kind so promo/paid balances stay unmerged.
 */
export function buildHistoryTimeline(treatments, now) {
  const items = [];
  (treatments || []).filter((pack) => isHistoryPack(pack, now)).forEach((pack) => {
    const kind = packKind(pack);
    const visits = sessionsWithPackageId(pack)
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    items.push({
      type: "pack",
      id: `pack-${pack.id}`,
      date: packHistoryDate(pack, now),
      packageId: pack.id,
      kind,
      usedUp: sessionsRemaining(pack) === 0,
      expired: isExpiredPack(pack, now),
      pack,
    });
    visits.forEach((session, idx) => {
      items.push({
        type: "session",
        id: `session-${pack.id}-${session.id}`,
        date: session.date,
        packageId: pack.id,
        kind,
        pack,
        session,
        sessionIndex: idx,
      });
    });
  });
  items.sort((a, b) => {
    const dt = new Date(b.date || 0) - new Date(a.date || 0);
    if (dt !== 0) return dt;
    if (a.type !== b.type) return a.type === "pack" ? -1 : 1;
    return 0;
  });
  return items;
}
