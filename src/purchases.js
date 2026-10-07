/**
 * Purchases live on the treatment document, next to the sessions already logged.
 * A package keeps one card. Buying again adds sessions (and an optional new expiry)
 * and appends a purchase. A different treatment is still its own card.
 *
 * Older cards often have no purchases array. Those stay untouched until someone
 * tops up. Until then the screen can show one line taken from the card itself,
 * with no invented date. A card with no session count and no purchases stays empty.
 */
import { coerceSessions, isJournal, normalizeTreatment } from "./packageStatus";

export function localISODate(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b));
      })
      .map((key) => value[key]);
  }
  return [];
}

/** Stored receipts only. Does not invent a line for an older card. */
export function normalizePurchaseList(purchases) {
  return asList(purchases)
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const next = { sessionsAdded: Number(entry.sessionsAdded) || 0 };
      if (entry.date) next.date = String(entry.date);
      if (entry.expiryDate) next.expiryDate = String(entry.expiryDate);
      if (entry.derived) next.derived = true;
      return next;
    });
}

/**
 * A single stored buy is the opening purchase. Editing the card's session
 * count or expiry corrects that buy and keeps its date.
 * Several buys are a history, so an edit leaves them alone.
 * No stored buys stays no stored buys — nothing is invented.
 */
export function purchasesAfterPackageEdit(existing, { totalSessions, expiryDate } = {}) {
  if (!existing || existing.purchases == null) return undefined;
  const stored = normalizePurchaseList(existing.purchases);
  if (stored.length !== 1 || stored[0].derived) return existing.purchases;
  const next = { ...stored[0], sessionsAdded: Number(totalSessions) || 0 };
  if (expiryDate) next.expiryDate = String(expiryDate);
  else delete next.expiryDate;
  return [next];
}

/** The buy recorded when a package is first added. */
export function purchaseFromPackageForm(form, now = new Date()) {
  const entry = {
    date: localISODate(now),
    sessionsAdded: parseInt(form && form.totalSessions, 10) || 0,
  };
  if (form && form.expiryDate) entry.expiryDate = form.expiryDate;
  return entry;
}

function derivedFromCard(treatment) {
  const total = Number(treatment && treatment.totalSessions);
  if (!Number.isFinite(total) || total <= 0) return [];
  const entry = { sessionsAdded: total, derived: true };
  if (treatment.expiryDate) entry.expiryDate = String(treatment.expiryDate);
  return [entry];
}

function byNewestPurchase(a, b) {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return new Date(b.date) - new Date(a.date);
}

/**
 * What to show. Stored purchases win. Otherwise one undated line from the
 * card, or nothing when the card has no session count to read.
 */
export function purchaseHistory(treatment) {
  if (!treatment || isJournal(treatment)) return [];
  const stored = normalizePurchaseList(treatment.purchases);
  if (stored.length) return stored.slice().sort(byNewestPurchase);
  return derivedFromCard(treatment);
}

export function purchaseHistoryIsDerivedOnly(treatment) {
  const rows = purchaseHistory(treatment);
  return rows.length > 0 && rows.every((row) => row.derived && !row.date);
}

/**
 * Add sessions to this package. Logged sessions stay as they are.
 * A blank expiry keeps the date already on the card.
 * Returns null when this is a journal, or the session count is not a real add.
 */
export function topUpTreatment(treatment, input, now = new Date()) {
  if (!treatment || isJournal(treatment)) return null;
  const add = parseInt(input && input.sessionsAdded, 10);
  if (!Number.isFinite(add) || add < 1) return null;

  const base = normalizeTreatment(treatment);
  const stored = normalizePurchaseList(base.purchases);
  const prior = stored.length ? stored : derivedFromCard(base);
  const requested = input && input.expiryDate != null ? String(input.expiryDate).trim() : "";
  const nextExpiry = requested || base.expiryDate || "";
  const entry = {
    date: localISODate(now),
    sessionsAdded: add,
  };
  if (nextExpiry) entry.expiryDate = nextExpiry;

  return {
    ...base,
    totalSessions: (Number(base.totalSessions) || 0) + add,
    expiryDate: nextExpiry,
    sessions: coerceSessions(base.sessions).map((session) => ({ ...session })),
    purchases: [...prior, entry],
  };
}
