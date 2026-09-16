/**
 * History vs active filtering for Become treatments.
 *
 * Today treatments live at users/{uid}/treatments with nested sessions
 * (totalSessions + sessions[] + expiryDate). A later ledger may use
 * packages with sessionsTotal / sessionsRemaining / source / expiresAt /
 * status. These helpers read both shapes so History can ship without
 * rewriting the data model.
 */

const FINISHED_STATUSES = new Set([
  "used_up",
  "used-up",
  "complete",
  "completed",
  "finished",
  "exhausted",
]);

export function getSessions(treatment) {
  return Array.isArray(treatment && treatment.sessions) ? treatment.sessions : [];
}

export function getTotalSessions(treatment) {
  const raw = treatment && (treatment.totalSessions != null ? treatment.totalSessions : treatment.sessionsTotal);
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  return getSessions(treatment).length;
}

export function getRemainingSessions(treatment) {
  if (treatment && treatment.sessionsRemaining != null) {
    const n = Number(treatment.sessionsRemaining);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return Math.max(0, getTotalSessions(treatment) - getSessions(treatment).length);
}

export function getExpiryDate(treatment) {
  if (!treatment) return null;
  return treatment.expiresAt || treatment.expiryDate || null;
}

export function getPackageSource(treatment) {
  if (!treatment) return null;
  const raw = treatment.source != null ? treatment.source : (treatment.kind || treatment.packType);
  if (raw == null || raw === "") return null;
  const value = String(raw).toLowerCase();
  if (value === "promo" || value === "promotional" || value === "promotion") return "promo";
  if (value === "paid") return "paid";
  return null;
}

function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isExpiredPackage(treatment, now = new Date()) {
  if (!treatment) return false;
  if (treatment.status && String(treatment.status).toLowerCase() === "expired") return true;
  const raw = getExpiryDate(treatment);
  if (!raw) return false;
  const expiry = startOfDay(raw);
  const today = startOfDay(now);
  if (!expiry || !today) return false;
  return expiry < today;
}

export function isUsedUpPackage(treatment) {
  if (!treatment) return false;
  if (treatment.status && FINISHED_STATUSES.has(String(treatment.status).toLowerCase())) {
    return true;
  }
  const total = getTotalSessions(treatment);
  if (total <= 0) return false;
  return getRemainingSessions(treatment) <= 0;
}

export function isHistoryPackage(treatment, now = new Date()) {
  return isUsedUpPackage(treatment) || isExpiredPackage(treatment, now);
}

export function isActivePackage(treatment, now = new Date()) {
  return !isHistoryPackage(treatment, now);
}

export function lastSessionDate(treatment) {
  const sessions = getSessions(treatment);
  if (!sessions.length) {
    return getExpiryDate(treatment);
  }
  return sessions.reduce((latest, session) => {
    if (!session || !session.date) return latest;
    if (!latest) return session.date;
    return new Date(session.date) > new Date(latest) ? session.date : latest;
  }, null);
}

export function partitionTreatments(treatments, now = new Date()) {
  const list = Array.isArray(treatments) ? treatments : [];
  const active = [];
  const finished = [];
  list.forEach((treatment) => {
    if (isHistoryPackage(treatment, now)) finished.push(treatment);
    else active.push(treatment);
  });
  finished.sort((a, b) => new Date(lastSessionDate(b) || 0) - new Date(lastSessionDate(a) || 0));
  return { active, finished };
}

export function completedSessions(treatments) {
  const list = Array.isArray(treatments) ? treatments : [];
  const items = [];
  list.forEach((treatment) => {
    const sessions = [...getSessions(treatment)].sort((a, b) => new Date(a.date) - new Date(b.date));
    sessions.forEach((session, idx) => {
      items.push({
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        clinic: treatment.clinic,
        palette: treatment.palette,
        session,
        sessionNumber: idx + 1,
        date: session && session.date,
      });
    });
  });
  items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return items;
}

export function hasHistoryItems(treatments, now = new Date()) {
  const { finished } = partitionTreatments(treatments, now);
  return finished.length > 0 || completedSessions(treatments).length > 0;
}
