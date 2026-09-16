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

/** Soonest expiry first; packs with no expiry date sink to the end. Same-expiry packs stay separate. */
export function compareExpirySoonest(a, b) {
  const aMissing = !a || !a.expiryDate;
  const bMissing = !b || !b.expiryDate;
  if (aMissing && bMissing) return String(a && a.id).localeCompare(String(b && b.id));
  if (aMissing) return 1;
  if (bMissing) return -1;
  const byDate = new Date(a.expiryDate) - new Date(b.expiryDate);
  if (byDate !== 0) return byDate;
  return String(a && a.id).localeCompare(String(b && b.id));
}

export function sortOpenPacks(treatments, now) {
  return [...(treatments || [])].filter((pack) => isOpenPack(pack, now)).sort(compareExpirySoonest);
}

/** Used-up: every session on this purchase has been logged. */
export function isUsedUp(treatment) {
  const total = Number(treatment && treatment.totalSessions) || 0;
  return total > 0 && sessionsRemaining(treatment) === 0;
}

/** Promo/Paid on a visit: stamp from log time, else the parent pack. */
export function sessionKind(session, treatment) {
  if (session && (session.sourceAtUse === "promo" || session.sourceAtUse === "paid")) {
    return session.sourceAtUse;
  }
  return packKind(treatment);
}

export function filterHistoryTimeline(items, filter) {
  const rows = items || [];
  if (filter === "sessions") return rows.filter((row) => row.type === "session");
  if (filter === "packages") return rows.filter((row) => row.type === "pack");
  return rows;
}

/**
 * Prefill Add package from a used-up/expired card.
 * Always a NEW purchase — never tops up the finished one.
 */
export function buyMorePrefill(source) {
  const pack = source || {};
  return {
    name: pack.name || "",
    clinic: pack.clinic || "",
    brandUnit: pack.brandUnit || "",
    totalSessions: pack.totalSessions != null ? String(pack.totalSessions) : "",
    frequency: pack.frequency,
    frequencyLabel: pack.frequencyLabel || "Monthly",
    customDays: pack.frequencyLabel === "Custom" ? String(pack.frequency || "") : "",
    expiryDate: "",
    notes: pack.notes || "",
    kind: "paid",
  };
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
 * Mixed History timeline, newest first:
 *   completed sessions (including visits on still-open packs)
 *   + used-up packages + expired packages.
 * Active purchases do not appear as package rows.
 * Each row keeps packageId and kind so promo/paid balances stay unmerged.
 */
export function buildHistoryTimeline(treatments, now) {
  const items = [];
  (treatments || []).forEach((pack) => {
    const visits = sessionsWithPackageId(pack)
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    visits.forEach((session, idx) => {
      items.push({
        type: "session",
        id: `session-${pack.id}-${session.id}`,
        date: session.date,
        packageId: pack.id,
        kind: sessionKind(session, pack),
        pack,
        session,
        sessionIndex: idx,
      });
    });
    if (isHistoryPack(pack, now)) {
      items.push({
        type: "pack",
        id: `pack-${pack.id}`,
        date: packHistoryDate(pack, now),
        packageId: pack.id,
        kind: packKind(pack),
        usedUp: isUsedUp(pack) || sessionsRemaining(pack) === 0,
        expired: isExpiredPack(pack, now),
        pack,
      });
    }
  });
  items.sort((a, b) => {
    const dt = new Date(b.date || 0) - new Date(a.date || 0);
    if (dt !== 0) return dt;
    if (a.type !== b.type) return a.type === "pack" ? -1 : 1;
    return String(b.id).localeCompare(String(a.id));
  });
  return items;
}
