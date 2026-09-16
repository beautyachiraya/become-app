/**
 * Package ledger helpers for Home (open packs) and History (finished work).
 *
 * Canonical shape (when wired):
 *   users/{uid}/packages/{id}  — one card per purchase (never merge promo + paid)
 *   users/{uid}/sessions/{id}  — a used visit, linked by packageId
 *
 * Treatments remain the rollup/detail document. If the packages/sessions
 * collections are empty, we derive the same shape from treatments so History
 * and Home still work for existing accounts.
 */

import { expiryDaysForPack } from "./packageExpiry";

export const HISTORY_TAB_LABEL = "History";

export const HISTORY_EMPTY_COPY =
  "No history yet. When you finish a session or a package, it shows up here.";

export const HOME_EMPTY_PACKAGE_COPY = "Add your first package";

export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(date) - start) / 86400000);
}

export function addDaysISO(date, n) {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}

export function normalizeSource(source) {
  return source === "promo" ? "promo" : "paid";
}

export function defaultExpiresAt(source, fromDate = new Date()) {
  return addDaysISO(fromDate, expiryDaysForPack(normalizeSource(source)));
}

export function computePackageStatus(pack, now = new Date()) {
  const remaining = Number(pack && pack.sessionsRemaining);
  if (remaining <= 0) return "used_up";
  const left = daysUntil(pack && pack.expiresAt, now);
  if (left !== null && left < 0) return "expired";
  return "open";
}

function asSessionList(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizePackage(raw, now = new Date()) {
  const sessions = asSessionList(raw && raw.sessions);
  const sessionsTotal = Number(
    raw && (raw.sessionsTotal != null ? raw.sessionsTotal : raw.totalSessions)
  ) || 0;
  const explicitRemaining = raw && raw.sessionsRemaining;
  const sessionsRemaining = explicitRemaining != null
    ? Math.max(0, Number(explicitRemaining) || 0)
    : Math.max(0, sessionsTotal - sessions.length);
  const source = normalizeSource(raw && raw.source);
  const expiresAt = (raw && (raw.expiresAt || raw.expiryDate)) || null;
  const treatment = (raw && (raw.treatment || raw.name)) || "";
  const id = raw && raw.id;
  return {
    id,
    treatmentId: (raw && raw.treatmentId) || id,
    clinic: (raw && raw.clinic) || "",
    treatment,
    name: treatment,
    sessionsTotal,
    sessionsRemaining,
    source,
    expiresAt,
    expiryDate: expiresAt,
    status: computePackageStatus({ sessionsRemaining, expiresAt }, now),
    palette: (raw && raw.palette) || 0,
    notes: (raw && raw.notes) || "",
    frequency: raw && raw.frequency,
    frequencyLabel: raw && raw.frequencyLabel,
    brandUnit: (raw && raw.brandUnit) || "",
    sessions,
  };
}

export function mergeLedgerAndTreatments(ledgerPackages, treatments, now = new Date()) {
  const map = new Map();
  (treatments || []).forEach((t) => {
    map.set(String(t.id), normalizePackage(t, now));
  });
  (ledgerPackages || []).forEach((p) => {
    const id = String(p.id);
    const fromLedger = normalizePackage(p, now);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, fromLedger);
      return;
    }
    map.set(id, {
      ...existing,
      ...fromLedger,
      sessions: fromLedger.sessions.length ? fromLedger.sessions : existing.sessions,
      frequency: fromLedger.frequency || existing.frequency,
      frequencyLabel: fromLedger.frequencyLabel || existing.frequencyLabel,
      palette: existing.palette,
      brandUnit: fromLedger.brandUnit || existing.brandUnit,
    });
  });
  return Array.from(map.values());
}

export function sortOpenPacks(packs, now = new Date()) {
  return (packs || [])
    .map((p) => normalizePackage(p, now))
    .filter((p) => p.status === "open")
    .sort((a, b) => {
      const da = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      const db = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return String(a.id).localeCompare(String(b.id));
    });
}

export function isOpenPack(pack, now = new Date()) {
  return normalizePackage(pack, now).status === "open";
}

export function isNeedsAttention(pack, now = new Date()) {
  const p = normalizePackage(pack, now);
  if (p.status !== "open") return false;
  const left = daysUntil(p.expiresAt, now);
  return left !== null && left >= 0 && left <= 30;
}

export function normalizeSession(raw, pack) {
  const usedAt = (raw && (raw.usedAt || raw.date)) || null;
  return {
    id: raw && raw.id,
    packageId: raw && raw.packageId != null ? raw.packageId : (pack && pack.id),
    clinic: (raw && raw.clinic) || (pack && pack.clinic) || "",
    treatment: (raw && (raw.treatment || raw.name)) || (pack && (pack.treatment || pack.name)) || "",
    usedAt,
    date: usedAt,
    sourceAtUse: normalizeSource((raw && raw.sourceAtUse) || (pack && pack.source)),
    notes: (raw && (raw.notes || raw.note)) || "",
    note: (raw && (raw.notes || raw.note)) || "",
    photo: (raw && raw.photo) || null,
  };
}

export function collectSessions({ ledgerSessions, packages, treatments } = {}) {
  const byId = new Map();
  const packById = new Map();
  (packages || []).forEach((p) => packById.set(String(p.id), normalizePackage(p)));
  (treatments || []).forEach((t) => {
    if (!packById.has(String(t.id))) packById.set(String(t.id), normalizePackage(t));
  });

  function add(session, pack) {
    const n = normalizeSession(session, pack);
    if (n.id == null) return;
    const key = String(n.id);
    if (!byId.has(key)) byId.set(key, n);
  }

  (ledgerSessions || []).forEach((s) => {
    add(s, packById.get(String(s.packageId)));
  });
  (treatments || []).forEach((t) => {
    const pack = packById.get(String(t.id));
    asSessionList(t.sessions).forEach((s) => add(s, pack));
  });
  (packages || []).forEach((p) => {
    const pack = packById.get(String(p.id));
    asSessionList(p.sessions).forEach((s) => add(s, pack));
  });

  return Array.from(byId.values());
}

export function usedCount(pack) {
  const p = normalizePackage(pack);
  return Math.max(0, p.sessionsTotal - p.sessionsRemaining);
}

export function packageFinishedSubline(pack) {
  const p = normalizePackage(pack);
  if (p.status === "expired") return `${p.sessionsRemaining} left · expired`;
  return `${usedCount(p)} of ${p.sessionsTotal} used`;
}

function lastSessionAt(pack, sessions) {
  const related = (sessions || []).filter((s) => String(s.packageId) === String(pack.id));
  if (!related.length) return pack.expiresAt || null;
  return related
    .slice()
    .sort((a, b) => new Date(b.usedAt || 0) - new Date(a.usedAt || 0))[0].usedAt;
}

export function buildHistoryEvents({ packages, sessions, now = new Date() } = {}) {
  const events = [];
  (sessions || []).forEach((s) => {
    const session = normalizeSession(s);
    events.push({
      type: "session",
      id: `session-${session.id}`,
      at: session.usedAt,
      session,
    });
  });
  (packages || []).forEach((raw) => {
    const pack = normalizePackage(raw, now);
    if (pack.status !== "used_up" && pack.status !== "expired") return;
    events.push({
      type: "package",
      id: `package-${pack.id}`,
      at: pack.status === "used_up" ? lastSessionAt(pack, sessions) : pack.expiresAt,
      pack,
    });
  });
  return events.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

export function filterHistoryEvents(events, filter) {
  if (filter === "sessions") return (events || []).filter((e) => e.type === "session");
  if (filter === "packages") return (events || []).filter((e) => e.type === "package");
  return events || [];
}

export function toLedgerPackageDoc(pack, now = new Date()) {
  const p = normalizePackage(pack, now);
  return {
    id: p.id,
    sessionsTotal: p.sessionsTotal,
    sessionsRemaining: p.sessionsRemaining,
    source: p.source,
    expiresAt: p.expiresAt,
    status: p.status,
    clinic: p.clinic,
    treatment: p.treatment,
    treatmentId: p.treatmentId,
  };
}

export function toLedgerSessionDoc(session, pack) {
  const s = normalizeSession(session, pack);
  return {
    id: s.id,
    packageId: s.packageId != null ? s.packageId : null,
    clinic: s.clinic,
    treatment: s.treatment,
    usedAt: s.usedAt,
    sourceAtUse: s.sourceAtUse,
    notes: s.notes || "",
    photo: s.photo || null,
  };
}

export function fmtReadableDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const text = String(value);
  const hasClock = text.includes("T") && !/T00:00:00/.test(text);
  if (!hasClock) return datePart;
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function isLocalPreview() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return false;
  return new URLSearchParams(window.location.search).get("preview") === "1";
}

/** Localhost ?preview=1 fixtures — mixed open / used_up / expired, promo + paid kept separate. */
export const PREVIEW_FIXTURES = {
  packages: [],
  sessions: [],
  treatments: [
    {
      id: 101,
      name: "Hydrafacial",
      clinic: "Pure Skin Spa",
      totalSessions: 6,
      frequency: 30,
      frequencyLabel: "Monthly",
      expiryDate: "2026-10-01",
      source: "promo",
      palette: 2,
      notes: "Diamond glow add-on",
      sessions: [
        { id: 1001, date: "2026-08-10", note: "Skin feels incredible", photo: null, packageId: 101, sourceAtUse: "promo" },
        { id: 1002, date: "2026-09-10", note: "Added vitamin C booster", photo: null, packageId: 101, sourceAtUse: "promo" },
      ],
    },
    {
      id: 102,
      name: "Laser Hair Removal",
      clinic: "Glow Clinic Bangkok",
      totalSessions: 8,
      frequency: 42,
      frequencyLabel: "Every 6 weeks",
      expiryDate: "2026-12-31",
      source: "paid",
      palette: 0,
      notes: "Full legs",
      sessions: [
        { id: 2001, date: "2026-01-15", note: "First session, mild redness after", photo: null, packageId: 102, sourceAtUse: "paid" },
        { id: 2002, date: "2026-02-26", note: "Noticeably less hair growth!", photo: null, packageId: 102, sourceAtUse: "paid" },
        { id: 2003, date: "2026-03-08", note: "Smoother skin already", photo: null, packageId: 102, sourceAtUse: "paid" },
      ],
    },
    {
      id: 103,
      name: "Botox",
      clinic: "Aesthetic Studio",
      totalSessions: 3,
      frequency: 90,
      frequencyLabel: "Every 3 months",
      expiryDate: "2026-11-01",
      source: "paid",
      palette: 1,
      notes: "Forehead & crow's feet",
      sessions: [
        { id: 3001, date: "2026-02-20", note: "20 units, love the result", photo: null, packageId: 103, sourceAtUse: "paid" },
        { id: 3002, date: "2026-05-20", note: "", photo: null, packageId: 103, sourceAtUse: "paid" },
        { id: 3003, date: "2026-08-20T14:30:00", note: "Last session of this pack", photo: null, packageId: 103, sourceAtUse: "paid" },
      ],
    },
    {
      id: 104,
      name: "LED Therapy",
      clinic: "Glow Clinic Bangkok",
      totalSessions: 4,
      frequency: 14,
      frequencyLabel: "Every 2 weeks",
      expiryDate: "2026-06-01",
      source: "promo",
      palette: 5,
      notes: "",
      sessions: [
        { id: 4001, date: "2026-04-12", note: "No downtime", photo: null, packageId: 104, sourceAtUse: "promo" },
      ],
    },
  ],
};
