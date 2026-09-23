/**
 * Self-logged upcoming visits. A visit is a reminder tied to an open package.
 * It is not a clinic reservation.
 *
 * Status is only planned, canceled, or completed.
 * Thailand messages on LINE. The UAE messages on WhatsApp.
 * A chat opens only when the user has saved that clinic's contact.
 */
import { coerceSessions, isJournal, listOpenPacks, packSessionCounts } from "./packageStatus";
import { explicitPackKind } from "./treatmentForm";

export const VISIT_STATUSES = ["planned", "canceled", "completed"];
const MESSAGE_CHANNELS = ["line", "whatsapp", "none"];

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function firstString(...values) {
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] == null) continue;
    const text = String(values[i]).trim();
    if (text) return text;
  }
  return "";
}

function dateOnly(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ""));
  return match ? match[1] : "";
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Open packages and active journals. Used-up and expired packages stay off the picker. */
export function packsForBooking(treatments, now) {
  return listOpenPacks(treatments, now);
}

export function suggestNextDate(treatment) {
  if (!treatment || treatment.frequency == null || treatment.frequency === "") return null;
  const days = Number(treatment.frequency);
  if (!Number.isFinite(days) || days <= 0) return null;
  const sessions = coerceSessions(treatment.sessions);
  let latest = "";
  sessions.forEach((session) => {
    const day = dateOnly(session && session.date);
    if (!day) return;
    if (!latest || day > latest) latest = day;
  });
  if (!latest) return null;
  const parts = latest.split("-").map(Number);
  const next = new Date(parts[0], parts[1] - 1, parts[2]);
  next.setDate(next.getDate() + days);
  return formatDateOnly(next);
}

/** True when the chosen day is later than the package expiry. Saving is still allowed. */
export function isAfterExpiry(dateStr, expiryDate) {
  const visit = dateOnly(dateStr);
  const exp = dateOnly(expiryDate);
  if (!visit || !exp) return false;
  return visit > exp;
}

export function packSummary(pack) {
  if (!pack) return null;
  const journal = isJournal(pack);
  const counts = packSessionCounts(pack);
  return {
    treatmentName: pack.name || "",
    clinicName: pack.clinic || "",
    kind: explicitPackKind(pack),
    journal,
    sessionsLeft: journal ? null : counts.remaining,
    expiryDate: journal ? "" : (pack.expiryDate || ""),
  };
}

export function sessionsLeftText(count, locale) {
  if (count == null || count === "") return "";
  const n = Number(count);
  if (!Number.isFinite(n)) return "";
  if (locale === "th") return `เหลือ ${n} ครั้ง`;
  return `${n} left`;
}

export function formatDateLabel(value, locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return "";
  const months = locale === "th" ? MONTHS_TH : MONTHS_EN;
  const month = months[Number(match[2]) - 1];
  if (!month) return "";
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function combinePlannedAt(date, time) {
  const day = dateOnly(date);
  if (!day) return "";
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return day;
  const parts = day.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], Number(match[1]), Number(match[2]), 0, 0).toISOString();
}

export function splitPlannedAt(plannedAt) {
  if (!plannedAt) return { date: "", time: "" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(plannedAt)) return { date: plannedAt, time: "" };
  const dt = new Date(plannedAt);
  if (Number.isNaN(dt.getTime())) return { date: "", time: "" };
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
}

export function formatVisitWhen(plannedAt, locale) {
  const split = splitPlannedAt(plannedAt);
  if (!split.date) return "";
  const dateLabel = formatDateLabel(split.date, locale);
  if (!split.time) return dateLabel;
  return `${dateLabel}, ${split.time}`;
}

function parsePlanned(plannedAt) {
  const day = dateOnly(plannedAt);
  if (!day) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(plannedAt))) {
    const parts = day.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);
  }
  const dt = new Date(plannedAt);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** Day-before 9:00 when that is still ahead. No push notification in v1 — the field is enough. */
export function remindTimestamp(plannedAt, now = new Date()) {
  const planned = parsePlanned(plannedAt);
  if (!planned) return null;
  const dayBefore = new Date(planned.getFullYear(), planned.getMonth(), planned.getDate() - 1, 9, 0, 0, 0);
  if (dayBefore.getTime() > now.getTime()) return dayBefore.toISOString();
  const morning = new Date(planned.getFullYear(), planned.getMonth(), planned.getDate(), 9, 0, 0, 0);
  if (morning.getTime() > now.getTime() && morning.getTime() < planned.getTime()) return morning.toISOString();
  if (planned.getTime() > now.getTime()) return planned.toISOString();
  return null;
}

export function cleanBookingUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch (err) {
    return "";
  }
}

/**
 * Country on the profile wins. When it is missing, THB means Thailand and AED means the UAE.
 * Anything else does not open a clinic chat.
 */
export function messageChannelForProfile(profile, currency) {
  const explicit = explicitCountry(profile);
  if (explicit === "TH") return { country: "TH", channel: "line" };
  if (explicit === "AE") return { country: "AE", channel: "whatsapp" };
  if (explicit) return { country: explicit, channel: "none" };
  const cur = String(currency || (profile && profile.currency) || "").toUpperCase();
  if (cur.includes("AED")) return { country: "AE", channel: "whatsapp" };
  if (cur.includes("THB")) return { country: "TH", channel: "line" };
  return { country: "", channel: "none" };
}

function explicitCountry(profile) {
  if (!profile) return "";
  const raw = firstString(profile.country, profile.region, profile.countryCode).toUpperCase();
  if (!raw) return "";
  if (raw === "TH" || raw === "THA" || raw.includes("THAILAND") || raw.includes("+66") || raw.endsWith(" TH")) return "TH";
  if (raw === "AE" || raw === "UAE" || raw.includes("EMIRATES") || raw.includes("+971") || raw.endsWith(" AE")) return "AE";
  return raw;
}

/** Saved clinic contact only. The user's own phone is never used as the clinic number. */
export function clinicContact(pack, profile) {
  const nested = pack && pack.clinicContact && typeof pack.clinicContact === "object" ? pack.clinicContact : {};
  const fromProfile = profile && profile.clinicContact && typeof profile.clinicContact === "object" ? profile.clinicContact : {};
  return {
    lineOaId: firstString(
      pack && pack.lineOaId,
      pack && pack.lineId,
      nested.lineOaId,
      nested.lineId,
      fromProfile.lineOaId,
      profile && profile.clinicLineOaId
    ),
    whatsappPhone: firstString(
      pack && pack.whatsappPhone,
      pack && pack.whatsapp,
      nested.whatsappPhone,
      nested.whatsapp,
      fromProfile.whatsappPhone,
      profile && profile.clinicWhatsapp
    ),
    bookingUrl: cleanBookingUrl(firstString(
      pack && pack.bookingUrl,
      pack && pack.bookingLink,
      nested.bookingUrl,
      fromProfile.bookingUrl,
      profile && profile.bookingUrl
    )),
  };
}

export function resolveBookingUrl(pack, profile, visit) {
  return cleanBookingUrl(visit && visit.bookingUrl) || clinicContact(pack, profile).bookingUrl || "";
}

export function withClinicContact(pack, contact) {
  const next = { ...(pack || {}) };
  const lineOaId = firstString(contact && contact.lineOaId);
  const whatsappPhone = firstString(contact && contact.whatsappPhone);
  const bookingUrl = cleanBookingUrl(contact && contact.bookingUrl);
  if (lineOaId) next.lineOaId = lineOaId;
  if (whatsappPhone) next.whatsappPhone = whatsappPhone;
  if (bookingUrl) next.bookingUrl = bookingUrl;
  return next;
}

export function lineMessageUrl(lineOaId, text) {
  const id = String(lineOaId || "").trim();
  if (!id) return null;
  const encodedText = encodeURIComponent(text || "");
  if (/^https?:\/\//i.test(id)) {
    if (!/^https:\/\/line\.me\/R\/oaMessage\//i.test(id)) return null;
    const base = id.split("?")[0].replace(/\/?$/, "/");
    return `${base}?${encodedText}`;
  }
  if (/\s/.test(id)) return null;
  return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodedText}`;
}

export function whatsappMessageUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text || "")}`;
}

export function messageUrl({ channel, contact, text }) {
  const info = contact || {};
  if (channel === "line") return lineMessageUrl(info.lineOaId, text);
  if (channel === "whatsapp") return whatsappMessageUrl(info.whatsappPhone, text);
  return null;
}

export function draftMessage({ pack, plannedAt, locale }) {
  const clinic = (pack && pack.clinic) || "";
  const treatment = (pack && pack.name) || "";
  const when = formatVisitWhen(plannedAt, locale);
  const summary = packSummary(pack) || {};
  const expiry = summary.expiryDate ? formatDateLabel(summary.expiryDate, locale) : "";
  if (locale === "th") {
    const lines = [clinic ? `สวัสดีค่ะ ${clinic} อยากไปรับ ${treatment}` : `อยากไปรับ ${treatment}`];
    if (!summary.journal && summary.sessionsLeft != null) {
      lines.push(expiry ? `เหลือ ${summary.sessionsLeft} ครั้ง หมดอายุ ${expiry}` : `เหลือ ${summary.sessionsLeft} ครั้ง`);
    }
    if (when) lines.push(`อยากไปประมาณ ${when}`);
    lines.push("อันนี้ไม่ใช่การยืนยันจากคลินิกนะคะ");
    return lines.join("\n");
  }
  const lines = [clinic ? `Hi ${clinic}, I'd like to come in for ${treatment}.` : `I'd like to come in for ${treatment}.`];
  if (!summary.journal && summary.sessionsLeft != null) {
    lines.push(expiry
      ? `I have ${summary.sessionsLeft} sessions left, expiring ${expiry}.`
      : `I have ${summary.sessionsLeft} sessions left.`);
  }
  if (when) lines.push(`I'm hoping for ${when}.`);
  lines.push("This isn't a confirmation from the clinic.");
  return lines.join("\n");
}

export function normalizeVisit(raw, docId) {
  const data = raw || {};
  const id = data.id != null && data.id !== "" ? data.id : docId;
  const status = VISIT_STATUSES.includes(data.status) ? data.status : "planned";
  const source = data.source === "suggested" ? "suggested" : "manual";
  const channel = MESSAGE_CHANNELS.includes(data.regionMessageChannel) ? data.regionMessageChannel : "none";
  const visit = {
    id: id != null && id !== "" ? String(id) : "",
    packageId: data.packageId != null ? String(data.packageId) : "",
    clinicName: data.clinicName || "",
    treatmentName: data.treatmentName || "",
    plannedAt: data.plannedAt || "",
    status,
    source,
    regionMessageChannel: channel,
  };
  if (data.remindAt) visit.remindAt = data.remindAt;
  if (data.notes) visit.notes = data.notes;
  if (data.bookingUrl) visit.bookingUrl = cleanBookingUrl(data.bookingUrl) || undefined;
  if (visit.bookingUrl === undefined) delete visit.bookingUrl;
  if (data.createdAt) visit.createdAt = data.createdAt;
  if (data.updatedAt) visit.updatedAt = data.updatedAt;
  return visit;
}

export function buildVisit({
  id,
  existing,
  pack,
  date,
  time,
  notes,
  remind,
  bookingUrl,
  channel,
  now = new Date(),
}) {
  if (!pack || pack.id == null || pack.id === "") return null;
  const day = dateOnly(date);
  if (!day) return null;
  const suggested = suggestNextDate(pack);
  const source = suggested && day === suggested ? "suggested" : "manual";
  const plannedAt = combinePlannedAt(day, time);
  const remindAt = remind ? remindTimestamp(plannedAt, now) : null;
  const link = cleanBookingUrl(bookingUrl);
  const note = String(notes || "").trim();
  const safeChannel = MESSAGE_CHANNELS.includes(channel) ? channel : "none";
  const visit = {
    id: String((existing && existing.id) || id || `v_${now.getTime()}`),
    packageId: String(pack.id),
    clinicName: pack.clinic || "",
    treatmentName: pack.name || "",
    plannedAt,
    status: "planned",
    source,
    regionMessageChannel: safeChannel,
    createdAt: (existing && existing.createdAt) || now.toISOString(),
    updatedAt: now.toISOString(),
  };
  if (remindAt) visit.remindAt = remindAt;
  if (note) visit.notes = note;
  if (link) visit.bookingUrl = link;
  return visit;
}

export function completeVisit(visit, now = new Date()) {
  return { ...normalizeVisit(visit), status: "completed", updatedAt: now.toISOString() };
}

export function cancelVisit(visit, now = new Date()) {
  return { ...normalizeVisit(visit), status: "canceled", updatedAt: now.toISOString() };
}

function plannedSortKey(plannedAt) {
  if (!plannedAt) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(plannedAt)) {
    const parts = plannedAt.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0).getTime();
  }
  const dt = new Date(plannedAt);
  return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
}

export function upcomingVisits(visits) {
  return (visits || [])
    .map((visit) => normalizeVisit(visit))
    .filter((visit) => visit.status === "planned")
    .sort((a, b) => plannedSortKey(a.plannedAt) - plannedSortKey(b.plannedAt));
}

export function earlierVisits(visits) {
  return (visits || [])
    .map((visit) => normalizeVisit(visit))
    .filter((visit) => visit.status === "canceled" || visit.status === "completed")
    .sort((a, b) => plannedSortKey(b.plannedAt) - plannedSortKey(a.plannedAt));
}
