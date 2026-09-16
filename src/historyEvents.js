import {
  packSource,
  packStatus,
  sessionsRemaining,
  sessionsWithPackageId,
} from "./packageStatus";

function eventTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function lastSessionDate(treatment) {
  const sessions = Array.isArray(treatment && treatment.sessions) ? treatment.sessions : [];
  if (!sessions.length) return null;
  return sessions.slice().sort((a, b) => eventTime(b.date || b.usedAt) - eventTime(a.date || a.usedAt))[0];
}

/**
 * Mixed History timeline from the treatments rollup.
 *
 * Session used  — every logged visit (including visits on still-open packs).
 * Package finished — used_up / expired packs only. Active "N left" packs are omitted.
 *
 * packageId is always the parent treatment id (hook for a future packages collection).
 */
export function buildHistoryEvents(treatments, now = new Date()) {
  const events = [];
  (Array.isArray(treatments) ? treatments : []).forEach((treatment) => {
    const packageId = treatment && treatment.id;
    const clinic = (treatment && treatment.clinic) || "";
    const treatmentName = (treatment && (treatment.treatment || treatment.name)) || "";
    const packSrc = packSource(treatment);

    sessionsWithPackageId(treatment).forEach((session) => {
      events.push({
        type: "session",
        id: `session-${packageId}-${session.id}`,
        at: session.usedAt || session.date || null,
        packageId: session.packageId || packageId,
        sessionId: session.id,
        clinic: session.clinic || clinic,
        treatment: session.treatment || treatmentName,
        source: packSource({ sourceAtUse: session.sourceAtUse, source: treatment.source }),
        notes: session.note || session.notes || "",
      });
    });

    const status = packStatus(treatment, now);
    if (status === "used_up" || status === "expired") {
      const last = lastSessionDate(treatment);
      const endedAt =
        status === "expired"
          ? treatment.expiryDate || (last && (last.usedAt || last.date)) || null
          : (last && (last.usedAt || last.date)) || treatment.expiryDate || null;
      const used = Array.isArray(treatment.sessions) ? treatment.sessions.length : 0;
      const total = Number(treatment.totalSessions) || 0;
      events.push({
        type: "package",
        id: `package-${packageId}`,
        at: endedAt,
        packageId,
        clinic,
        treatment: treatmentName,
        source: packSrc,
        status,
        used,
        total,
        remaining: sessionsRemaining(treatment),
      });
    }
  });

  return events.sort((a, b) => {
    const dt = eventTime(b.at) - eventTime(a.at);
    if (dt !== 0) return dt;
    if (a.type !== b.type) return a.type === "package" ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function filterHistoryEvents(events, { kind = "all", clinic = "all" } = {}) {
  return (Array.isArray(events) ? events : []).filter((event) => {
    if (kind === "sessions" && event.type !== "session") return false;
    if (kind === "packages" && event.type !== "package") return false;
    if (clinic && clinic !== "all" && event.clinic !== clinic) return false;
    return true;
  });
}

export function historyClinics(events) {
  const names = new Set();
  (Array.isArray(events) ? events : []).forEach((event) => {
    if (event && event.clinic) names.add(event.clinic);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export const HISTORY_EMPTY_COPY =
  "No history yet. When you finish a session or a package, it shows up here.";
