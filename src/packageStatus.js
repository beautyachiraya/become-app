/**
 * Open vs history mapping for treatment cards.
 *
 * trackMode "journal" is a no-expiry diary. It stays on Home until removed.
 * Missing trackMode behaves as a package.
 *
 * Packages:
 *   remaining  = totalSessions - sessions.length
 *   expired    = expiryDate is in the past
 *   open/Home  = remaining > 0 AND not expired
 *   history    = remaining === 0 (used up) OR expired
 *
 * Journals:
 *   sessionsTotal / sessionsRemaining / expiresAt stay null
 *   open/Home      = status is not "removed"
 *   history        = logged visits only — the journal card is not "used up"
 *
 * kind = treatment.kind "promo" | "paid" (missing → paid) for packages that stored it.
 * Promo and paid packs stay separate cards / timeline rows.
 * Never sum remaining across kinds.
 */

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

/** Diary track. Anything else, including a missing trackMode, is a package. */
export function isJournal(treatment) {
  return Boolean(treatment && treatment.trackMode === "journal");
}

export function sessionsRemaining(treatment) {
  if (isJournal(treatment)) return null;
  const total = Number(treatment && treatment.totalSessions) || 0;
  return Math.max(0, total - sessionsUsed(treatment));
}

/** Keep LEFT and used/total on the same arithmetic so Home cannot show 0/1 with "1 LEFT". */
export function packSessionCounts(treatment) {
  const used = sessionsUsed(treatment);
  if (isJournal(treatment)) return { used, total: null, remaining: null };
  const total = Number(treatment && treatment.totalSessions) || 0;
  return { used, total, remaining: Math.max(0, total - used) };
}

export function normalizeTreatment(raw, docId) {
  const data = raw || {};
  const id = data.id != null && data.id !== "" ? data.id : docId;
  const paletteNum = Number(data.palette);
  const journal = data.trackMode === "journal";
  const next = {
    ...data,
    ...(id != null && id !== "" ? { id } : {}),
    totalSessions: journal ? null : (Number(data.totalSessions) || 0),
    sessions: coerceSessions(data.sessions),
    palette: Number.isFinite(paletteNum) ? paletteNum : 0,
  };
  if (journal) {
    next.sessionsTotal = null;
    next.sessionsRemaining = null;
    next.expiryDate = null;
    next.expiresAt = null;
    next.status = data.status === "removed" ? "removed" : "active";
  }
  return next;
}

export function appendSession(treatment, session) {
  const base = normalizeTreatment(treatment);
  const visit = {
    ...(session || {}),
    packageId: session && session.packageId != null && session.packageId !== ""
      ? session.packageId
      : base.id,
  };
  const next = {
    ...base,
    sessions: [...coerceSessions(base.sessions), visit],
  };
  if (isJournal(base)) {
    next.totalSessions = null;
    next.sessionsTotal = null;
    next.sessionsRemaining = null;
    next.expiryDate = null;
    next.expiresAt = null;
    next.status = base.status === "removed" ? "removed" : "active";
  }
  return next;
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
  if (isJournal(treatment)) return false;
  const left = daysUntil(treatment && treatment.expiryDate, now);
  return left !== null && left < 0;
}

/** Home: journal stays until removed; a package still has sessions and has not expired. */
export function isOpenPack(treatment, now) {
  if (isJournal(treatment)) return treatment.status !== "removed";
  return sessionsRemaining(treatment) > 0 && !isExpiredPack(treatment, now);
}

/** History packs are used-up or expired packages. A journal is never "used up". */
export function isHistoryPack(treatment, now) {
  if (isJournal(treatment)) return false;
  return sessionsRemaining(treatment) === 0 || isExpiredPack(treatment, now);
}

/**
 * Needs attention = actionable only (open pack expiring within 30 days).
 * Finished packs (used-up / expired) are never urgent.
 */
export function isNeedsAttention(treatment, now) {
  if (isJournal(treatment)) return false;
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
 * Mixed History timeline: finished packs + completed sessions, newest first.
 * Journal visits are included as session rows. The journal itself stays on Home.
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
      trackMode: "package",
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
        trackMode: "package",
        pack,
        session,
        sessionIndex: idx,
      });
    });
  });
  (treatments || []).filter((pack) => isJournal(pack) && pack.status !== "removed").forEach((pack) => {
    const visits = sessionsWithPackageId(pack)
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    visits.forEach((session, idx) => {
      items.push({
        type: "session",
        id: `session-${pack.id}-${session.id}`,
        date: session.date,
        packageId: pack.id,
        kind: packKind(pack),
        trackMode: "journal",
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
