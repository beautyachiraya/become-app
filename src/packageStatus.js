/**
 * Open vs history mapping for the current treatment-card data model.
 *
 * Treatments are the package unit today (not a future ledger).
 *   remaining  = min(total - used, stored remaining) — used-up if any signal is 0
 *   expired    = expiryDate is in the past
 *   open/Home  = remaining > 0 AND not expired AND not a finished status
 *   history    = remaining === 0 OR used_up/Complete OR expired
 *   kind       = treatment.kind "promo" | "paid" (missing → paid)
 *
 * Promo and paid packs stay separate cards / timeline rows.
 * Never sum remaining across kinds.
 */

const FINISHED_STATUSES = new Set([
  "used_up",
  "usedup",
  "used-up",
  "used up",
  "complete",
  "completed",
  "done",
  "finished",
  "depleted",
  "exhausted",
  "closed",
]);

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstFinite(...values) {
  for (let i = 0; i < values.length; i++) {
    const n = finiteNumber(values[i]);
    if (n != null) return n;
  }
  return null;
}

function statusToken(value) {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(date) - start) / 86400000);
}

/**
 * Firestore usually returns sessions as an array, but a map-shaped field
 * ({0: session}) must still count as logged visits. Missing/null → [].
 */
export function coerceSessions(sessions) {
  if (Array.isArray(sessions)) return sessions.filter(Boolean);
  if (sessions && typeof sessions === "object") {
    return Object.keys(sessions)
      .sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b));
      })
      .map((key) => sessions[key])
      .filter(Boolean);
  }
  return [];
}

export function sessionsUsed(treatment) {
  return coerceSessions(treatment && treatment.sessions).length;
}

/** Stamped used_up / Complete (and equivalents) always leave Home. */
export function isFinishedStatus(treatment) {
  if (!treatment) return false;
  if (treatment.usedUp === true || treatment.complete === true || treatment.completed === true) {
    return true;
  }
  const token = statusToken(treatment.status || treatment.state || treatment.packageStatus);
  return FINISHED_STATUSES.has(token) || FINISHED_STATUSES.has(token.replace(/\s/g, "_"));
}

export function sessionsRemaining(treatment) {
  return packSessionCounts(treatment).remaining;
}

/**
 * Keep LEFT and used/total on the same arithmetic so Home cannot show 0/1 with "1 LEFT".
 * Remaining is the most conservative signal: session list, stored remaining, or a finished status.
 */
export function packSessionCounts(treatment) {
  const total = firstFinite(
    treatment && treatment.totalSessions,
    treatment && treatment.sessionsTotal,
    treatment && treatment.total
  ) || 0;
  const usedFromSessions = sessionsUsed(treatment);
  const storedUsed = firstFinite(treatment && treatment.used, treatment && treatment.sessionsUsed);
  const storedRemaining = firstFinite(
    treatment && treatment.remaining,
    treatment && treatment.sessionsRemaining,
    treatment && treatment.left
  );
  let used = usedFromSessions;
  if (storedUsed != null) used = Math.max(used, storedUsed);
  if (storedRemaining != null && total > 0) used = Math.max(used, total - Math.max(0, storedRemaining));
  let remaining = Math.max(0, total - used);
  if (storedRemaining != null) remaining = Math.min(remaining, Math.max(0, storedRemaining));
  if (isFinishedStatus(treatment)) {
    remaining = 0;
    if (total > 0) used = Math.max(used, total);
  }
  return { used, total, remaining: Math.max(0, remaining) };
}

export function normalizeTreatment(raw, docId) {
  const data = raw || {};
  const id = data.id != null && data.id !== "" ? data.id : docId;
  const paletteNum = Number(data.palette);
  return {
    ...data,
    ...(id != null && id !== "" ? { id } : {}),
    totalSessions: Number(data.totalSessions) || 0,
    sessions: coerceSessions(data.sessions),
    palette: Number.isFinite(paletteNum) ? paletteNum : 0,
  };
}

export function appendSession(treatment, session) {
  return {
    ...normalizeTreatment(treatment),
    sessions: [...coerceSessions(treatment && treatment.sessions), session],
  };
}

/** Append a visit onto one pack by id; every other pack is passed through unchanged. */
export function applySessionLog(treatments, packId, session) {
  return (treatments || []).map((pack) =>
    String(pack.id) === String(packId) ? appendSession(pack, session) : pack
  );
}

export function listOpenPacks(treatments, now) {
  return (treatments || [])
    .filter((pack) => isOpenPack(pack, now))
    .slice()
    .sort(compareExpirySoonest);
}

/**
 * Merge a Firestore snapshot with in-memory packs.
 * Prefers the copy with more logged sessions so a stale unused snapshot cannot
 * revive a used-up pack or drop a locally added still-open pack.
 */
export function mergeTreatmentsById(local, loaded) {
  const byId = new Map();
  const put = (pack) => {
    if (!pack || pack.id == null || pack.id === "") return;
    const id = String(pack.id);
    const existing = byId.get(id);
    if (!existing || sessionsUsed(pack) >= sessionsUsed(existing)) {
      byId.set(id, pack);
    }
  };
  (loaded || []).forEach(put);
  (local || []).forEach(put);
  const seen = new Set();
  const out = [];
  const pushChosen = (pack) => {
    if (!pack || pack.id == null || pack.id === "") return;
    const id = String(pack.id);
    if (seen.has(id)) return;
    const chosen = byId.get(id);
    if (!chosen) return;
    out.push(chosen);
    seen.add(id);
  };
  (local || []).forEach(pushChosen);
  (loaded || []).forEach(pushChosen);
  return out;
}

export function isExpiredPack(treatment, now) {
  const left = daysUntil(treatment && treatment.expiryDate, now);
  return left !== null && left < 0;
}

/** Home: still has sessions to use, has not passed expiry, and is not stamped finished. */
export function isOpenPack(treatment, now) {
  if (isFinishedStatus(treatment)) return false;
  const { remaining } = packSessionCounts(treatment);
  if (remaining === 0) return false;
  if (isExpiredPack(treatment, now)) return false;
  return true;
}

/** History: used-up (0 left / Complete / used_up) or expired. Complements Home. */
export function isHistoryPack(treatment, now) {
  return !isOpenPack(treatment, now);
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
  return coerceSessions(treatment && treatment.sessions).map((session) => ({ ...session, packageId }));
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
  const sessions = coerceSessions(treatment && treatment.sessions);
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
