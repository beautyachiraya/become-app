/**
 * History vs active filtering for Become treatments.
 *
 * Today treatments live at users/{uid}/treatments with nested sessions
 * (totalSessions + sessions[]). A later ledger may use packages with
 * sessionsTotal / sessionsRemaining / status. These helpers read both
 * shapes so History can ship without rewriting the data model.
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

export function isUsedUpPackage(treatment) {
  if (!treatment) return false;
  if (treatment.status && FINISHED_STATUSES.has(String(treatment.status).toLowerCase())) {
    return true;
  }
  const total = getTotalSessions(treatment);
  if (total <= 0) return false;
  return getRemainingSessions(treatment) <= 0;
}

export function isActivePackage(treatment) {
  return !isUsedUpPackage(treatment);
}

export function lastSessionDate(treatment) {
  const sessions = getSessions(treatment);
  if (!sessions.length) {
    return (treatment && (treatment.expiresAt || treatment.expiryDate)) || null;
  }
  return sessions.reduce((latest, session) => {
    if (!session || !session.date) return latest;
    if (!latest) return session.date;
    return new Date(session.date) > new Date(latest) ? session.date : latest;
  }, null);
}

export function partitionTreatments(treatments) {
  const list = Array.isArray(treatments) ? treatments : [];
  const active = [];
  const finished = [];
  list.forEach((treatment) => {
    if (isUsedUpPackage(treatment)) finished.push(treatment);
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

export function hasHistoryItems(treatments) {
  const { finished } = partitionTreatments(treatments);
  return finished.length > 0 || completedSessions(treatments).length > 0;
}
