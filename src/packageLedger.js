/**
 * Adapter toward the preferred package/session ledger.
 *
 * Preferred (future) collections:
 *   users/{uid}/packages/{id}
 *     sessionsTotal, sessionsRemaining, source: promo|paid,
 *     expiresAt, status: active|used_up|expired
 *   users/{uid}/sessions/{id}
 *     packageId, clinic, treatment, usedAt, sourceAtUse
 *
 * Today the app still stores treatments as the rollup:
 *   users/{uid}/treatments/{id} with nested sessions[].
 * Treatments are not a single remaining integer — promo and paid
 * packs stay as separate cards and are never merged into one balance.
 *
 * Temp expiry defaults live in packageExpiry.js (promo 90 / paid 180).
 */

import { expiryDaysForPack } from "./packageExpiry";

export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(date) - start) / 86400000);
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const hasTime = typeof d === "string" ? /T\d{2}:\d{2}/.test(d) : dt.getHours() + dt.getMinutes() + dt.getSeconds() !== 0;
  const datePart = dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  if (!hasTime) return datePart;
  const timePart = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function normalizeSource(value) {
  const v = value == null ? "" : String(value).trim().toLowerCase();
  if (v === "promo" || v === "promotional") return "promo";
  if (v === "paid") return "paid";
  return null;
}

export function defaultExpiryDate(source, fromDate = new Date()) {
  const kind = normalizeSource(source) || "paid";
  const days = expiryDaysForPack(kind);
  const dt = new Date(fromDate);
  dt.setHours(12, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sessionsRemaining(pack) {
  const total = Number(pack && (pack.sessionsTotal ?? pack.totalSessions)) || 0;
  if (Array.isArray(pack && pack.sessions)) {
    return Math.max(0, total - pack.sessions.length);
  }
  if (pack && typeof pack.sessionsRemaining === "number") {
    return Math.max(0, pack.sessionsRemaining);
  }
  return Math.max(0, total);
}

export function isExpiredPack(pack, now) {
  const expiry = pack && (pack.expiresAt || pack.expiryDate);
  const left = daysUntil(expiry, now);
  return left !== null && left < 0;
}

/** Derive live status. Remaining === 0 is used_up even if expiry is still in the future. */
export function derivePackageStatus(pack, now) {
  if (sessionsRemaining(pack) <= 0) return "used_up";
  if (isExpiredPack(pack, now)) return "expired";
  return "active";
}

/** Home: still has sessions left and has not passed expiry. */
export function isOpenPack(pack, now) {
  return derivePackageStatus(pack, now) === "active";
}

/** History archive: used-up or expired. Active remaining packs never belong here as package rows. */
export function isFinishedPack(pack, now) {
  const status = derivePackageStatus(pack, now);
  return status === "used_up" || status === "expired";
}

/** Needs attention = open pack expiring within 30 days. Finished packs are not urgent. */
export function isNeedsAttention(pack, now) {
  if (!isOpenPack(pack, now)) return false;
  const left = daysUntil(pack && (pack.expiresAt || pack.expiryDate), now);
  return left !== null && left >= 0 && left <= 30;
}

export function stampPackageFields(pack, now) {
  if (!pack) return pack;
  const sessions = Array.isArray(pack.sessions) ? pack.sessions : [];
  const sessionsTotal = Number(pack.sessionsTotal ?? pack.totalSessions) || 0;
  const source = normalizeSource(pack.source);
  const expiryDate = pack.expiryDate || pack.expiresAt || "";
  const stamped = {
    ...pack,
    name: pack.name || pack.treatment || "",
    treatment: pack.treatment || pack.name || "",
    clinic: pack.clinic || "",
    sessions,
    totalSessions: sessionsTotal,
    sessionsTotal,
    source,
    expiryDate,
    expiresAt: pack.expiresAt || expiryDate || null,
  };
  const remaining = sessionsRemaining(stamped);
  return {
    ...stamped,
    sessionsRemaining: remaining,
    status: derivePackageStatus(stamped, now),
  };
}

export function attachSessionLedgerFields(session, pack) {
  const usedAt = (session && (session.usedAt || session.date)) || null;
  return {
    ...(session || {}),
    packageId: session && session.packageId != null ? session.packageId : pack && pack.id,
    clinic: (session && session.clinic) || (pack && pack.clinic) || "",
    treatment: (session && session.treatment) || (pack && (pack.treatment || pack.name)) || "",
    usedAt,
    date: (session && session.date) || usedAt,
    sourceAtUse: normalizeSource(session && session.sourceAtUse) || (pack && pack.source) || null,
  };
}

function msOf(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function titleFor(treatment, clinic) {
  const name = treatment || "Treatment";
  if (!clinic) return name;
  return `${name} · ${clinic}`;
}

function lastSessionAt(pack) {
  const sessions = Array.isArray(pack && pack.sessions) ? pack.sessions : [];
  let latest = 0;
  sessions.forEach((session) => {
    latest = Math.max(latest, msOf(session.usedAt || session.date));
  });
  return latest;
}

export function buildHistoryTimeline(packs, extraSessions = [], now) {
  const rows = [];
  const seenVisit = new Set();
  const list = Array.isArray(packs) ? packs : [];

  list.forEach((raw) => {
    const pack = stampPackageFields(raw, now);
    const visits = Array.isArray(pack.sessions) ? pack.sessions : [];
    visits.forEach((session, idx) => {
      const visit = attachSessionLedgerFields(session, pack);
      const key = `${visit.packageId}:${visit.id}`;
      if (visit.id != null) seenVisit.add(key);
      const atMs = msOf(visit.usedAt);
      rows.push({
        kind: "session",
        id: `session-${visit.packageId}-${visit.id ?? idx}`,
        atMs,
        packageId: visit.packageId,
        sessionId: visit.id,
        sessionIdx: idx,
        treatment: visit.treatment,
        clinic: visit.clinic,
        source: visit.sourceAtUse,
        title: titleFor(visit.treatment, visit.clinic),
        meta: fmtDateTime(visit.usedAt),
        subline: visit.note ? String(visit.note) : "1 session",
        note: visit.note || "",
      });
    });

    if (isFinishedPack(pack, now)) {
      const status = pack.status;
      const endedAt = status === "expired"
        ? (pack.expiresAt || pack.expiryDate)
        : (lastSessionAt(pack) ? new Date(lastSessionAt(pack)).toISOString() : (pack.expiresAt || pack.expiryDate));
      const used = Array.isArray(pack.sessions) ? pack.sessions.length : Math.max(0, pack.sessionsTotal - pack.sessionsRemaining);
      const subline = status === "expired" && pack.sessionsRemaining > 0
        ? `${pack.sessionsRemaining} left · expired`
        : `${used} of ${pack.sessionsTotal} used`;
      rows.push({
        kind: "package",
        id: `package-${pack.id}`,
        atMs: msOf(endedAt) + (status === "used_up" ? 1 : 0),
        packageId: pack.id,
        treatment: pack.treatment || pack.name,
        clinic: pack.clinic,
        source: pack.source,
        status,
        title: titleFor(pack.treatment || pack.name, pack.clinic),
        meta: `${status === "expired" ? "Expired" : "Used up"} · ${fmtDate(endedAt)}`,
        subline,
        sessionsRemaining: pack.sessionsRemaining,
        sessionsTotal: pack.sessionsTotal,
      });
    }
  });

  extraSessions.forEach((session, idx) => {
    const pack = list.find((p) => String(p.id) === String(session.packageId));
    const visit = attachSessionLedgerFields(session, pack);
    const key = `${visit.packageId}:${visit.id}`;
    if (visit.id != null && seenVisit.has(key)) return;
    rows.push({
      kind: "session",
      id: `session-extra-${visit.id ?? idx}`,
      atMs: msOf(visit.usedAt),
      packageId: visit.packageId,
      sessionId: visit.id,
      sessionIdx: null,
      treatment: visit.treatment,
      clinic: visit.clinic,
      source: visit.sourceAtUse,
      title: titleFor(visit.treatment, visit.clinic),
      meta: fmtDateTime(visit.usedAt),
      subline: visit.note ? String(visit.note) : "1 session",
      note: visit.note || "",
    });
  });

  rows.sort((a, b) => {
    const dt = (b.atMs || 0) - (a.atMs || 0);
    if (dt !== 0) return dt;
    if (a.kind !== b.kind) return a.kind === "package" ? -1 : 1;
    return 0;
  });
  return rows;
}

export function filterHistoryRows(rows, { kind = "all", clinic = "all" } = {}) {
  return (rows || []).filter((row) => {
    if (kind === "sessions" && row.kind !== "session") return false;
    if (kind === "packages" && row.kind !== "package") return false;
    if (clinic && clinic !== "all" && row.clinic !== clinic) return false;
    return true;
  });
}

export function clinicsFromRows(rows) {
  const names = [];
  const seen = new Set();
  (rows || []).forEach((row) => {
    if (!row.clinic || seen.has(row.clinic)) return;
    seen.add(row.clinic);
    names.push(row.clinic);
  });
  return names.sort((a, b) => a.localeCompare(b));
}

/**
 * Prefill for Buy more: a NEW package for the same clinic + treatment.
 * Never copies remaining sessions or the finished pack id (no top-up merge).
 */
export function buyMoreFormFromPack(pack, treatmentTypes = []) {
  const name = (pack && (pack.name || pack.treatment)) || "Other";
  const known = treatmentTypes.indexOf(name) !== -1;
  return {
    name: known ? name : "Other",
    customName: known ? "" : name,
    clinic: (pack && pack.clinic) || "",
    brandUnit: (pack && pack.brandUnit) || "",
    totalSessions: "",
    frequency: pack && pack.frequency ? pack.frequency : 30,
    frequencyLabel: (pack && pack.frequencyLabel) || "Monthly",
    customDays: "",
    expiryDate: "",
    notes: "",
    source: normalizeSource(pack && pack.source) || "",
  };
}

export function mergeLedger({ treatments = [], packages = [], sessions = [] } = {}, now) {
  const byId = new Map();

  function ingest(raw) {
    const pack = stampPackageFields(raw, now);
    if (!pack || pack.id == null || pack.id === "") return;
    const key = String(pack.id);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, pack);
      return;
    }
    const richerSessions = (pack.sessions && pack.sessions.length >= existing.sessions.length)
      ? pack.sessions
      : existing.sessions;
    byId.set(key, stampPackageFields({
      ...existing,
      ...pack,
      sessions: richerSessions,
      source: pack.source || existing.source,
    }, now));
  }

  treatments.forEach(ingest);
  packages.forEach((pkg) => ingest({
    ...pkg,
    name: pkg.treatment || pkg.name,
    totalSessions: pkg.sessionsTotal ?? pkg.totalSessions,
    expiryDate: pkg.expiresAt || pkg.expiryDate,
  }));

  const extras = (sessions || []).map((session) => attachSessionLedgerFields(session, byId.get(String(session.packageId))));
  extras.forEach((visit) => {
    if (visit.packageId == null) return;
    const pack = byId.get(String(visit.packageId));
    if (!pack) return;
    const exists = pack.sessions.some((s) => String(s.id) === String(visit.id));
    if (exists) return;
    pack.sessions = [...pack.sessions, visit];
    byId.set(String(pack.id), stampPackageFields(pack, now));
  });

  return {
    packs: Array.from(byId.values()),
    extraSessions: extras,
  };
}

/** Local-only fixtures for #preview-ledger. Not used in production. */
export const PREVIEW_LEDGER_PACKS = [
  {
    id: "p-open-promo",
    name: "Hydrafacial",
    clinic: "Pure Skin Spa",
    totalSessions: 6,
    source: "promo",
    expiryDate: "2026-11-01",
    palette: 2,
    frequency: 30,
    frequencyLabel: "Monthly",
    notes: "Diamond glow add-on",
    sessions: [
      { id: 11, date: "2026-08-10", note: "Glow is back" },
    ],
  },
  {
    id: "p-open-paid",
    name: "Laser Hair Removal",
    clinic: "Glow Clinic Bangkok",
    totalSessions: 8,
    source: "paid",
    expiryDate: "2026-12-31",
    palette: 0,
    frequency: 42,
    frequencyLabel: "Every 6 weeks",
    notes: "Full legs",
    sessions: [
      { id: 21, date: "2026-01-15", note: "First session, mild redness after" },
      { id: 22, date: "2026-02-26", note: "Noticeably less hair growth!" },
      { id: 23, date: "2026-03-08", note: "Smoother skin already" },
    ],
  },
  {
    id: "p-used",
    name: "Botox",
    clinic: "Aesthetic Studio",
    totalSessions: 3,
    source: "paid",
    expiryDate: "2026-12-01",
    palette: 1,
    frequency: 90,
    frequencyLabel: "Every 3 months",
    notes: "Forehead & crow's feet",
    sessions: [
      { id: 31, date: "2026-03-01", note: "20 units" },
      { id: 32, date: "2026-06-01" },
      { id: 33, date: "2026-09-01", note: "Last visit of the pack" },
    ],
  },
  {
    id: "p-expired",
    name: "Chemical Peel",
    clinic: "Glow Clinic Bangkok",
    totalSessions: 4,
    source: "promo",
    expiryDate: "2025-09-30",
    palette: 4,
    frequency: 30,
    frequencyLabel: "Monthly",
    sessions: [
      { id: 41, date: "2025-06-01", note: "Before summer" },
    ],
  },
];
