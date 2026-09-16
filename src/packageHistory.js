/**
 * Split treatments into Home (open) vs History (completed / used-up / expired).
 *
 * Does not delete data. Reads existing treatment + nested session fields,
 * plus optional `source` / `remaining` / `packageId` when present.
 */

export function remainingSessions(pkg) {
  if (!pkg) return 0;
  const used = Array.isArray(pkg.sessions) ? pkg.sessions.length : 0;
  if (pkg.remaining != null && pkg.remaining !== "") {
    const n = Number(pkg.remaining);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  const total = Number(pkg.totalSessions);
  if (!Number.isFinite(total)) return 0;
  return Math.max(0, total - used);
}

export function packSource(pkg) {
  if (!pkg) return null;
  const raw = pkg.source || pkg.kind || pkg.packType || pkg.purchaseType || "";
  const s = String(raw).trim().toLowerCase();
  if (s === "promo" || s === "promotional" || s === "promotion") return "promo";
  if (s === "paid" || s === "purchase" || s === "full") return "paid";
  return null;
}

export function packageIdOf(pkg, session) {
  if (session && session.packageId != null && session.packageId !== "") return session.packageId;
  if (pkg && pkg.packageId != null && pkg.packageId !== "") return pkg.packageId;
  if (pkg && pkg.id != null) return pkg.id;
  return null;
}

function startOfDay(value) {
  const dt = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function isExpiredPackage(pkg, now = new Date()) {
  if (!pkg || !pkg.expiryDate) return false;
  const end = startOfDay(pkg.expiryDate);
  const today = startOfDay(now);
  if (!end || !today) return false;
  return end < today;
}

export function isUsedUpPackage(pkg) {
  if (!pkg) return false;
  const total = Number(pkg.totalSessions);
  const remaining = remainingSessions(pkg);
  if (Number.isFinite(total) && total > 0) return remaining <= 0;
  if (pkg.remaining != null && pkg.remaining !== "") return remaining <= 0;
  return false;
}

export function isOpenPackage(pkg, now = new Date()) {
  return !!pkg && !isUsedUpPackage(pkg) && !isExpiredPackage(pkg, now);
}

export function isHistoryPackage(pkg, now = new Date()) {
  return !!pkg && (isUsedUpPackage(pkg) || isExpiredPackage(pkg, now));
}

export function closedPackageReason(pkg, now = new Date()) {
  const used = isUsedUpPackage(pkg);
  const expired = isExpiredPackage(pkg, now);
  if (used && expired) return "used_up_expired";
  if (used) return "used_up";
  if (expired) return "expired";
  return null;
}

export function lastSessionDate(pkg) {
  const sessions = pkg && Array.isArray(pkg.sessions) ? pkg.sessions : [];
  if (!sessions.length) return null;
  const dated = sessions.filter((s) => s && s.date);
  if (!dated.length) return null;
  return [...dated].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
}

export function splitPackages(packages, now = new Date()) {
  const list = Array.isArray(packages) ? packages : [];
  const open = [];
  const closed = [];
  for (const pkg of list) {
    if (isHistoryPackage(pkg, now)) closed.push(pkg);
    else open.push(pkg);
  }
  return { open, closed };
}

export function flattenCompletedSessions(packages) {
  const list = Array.isArray(packages) ? packages : [];
  const items = [];
  for (const pkg of list) {
    const sessions = Array.isArray(pkg.sessions) ? pkg.sessions : [];
    for (const session of sessions) {
      if (!session) continue;
      items.push({
        type: "session",
        id: "session-" + pkg.id + "-" + session.id,
        date: session.date || null,
        treatmentName: pkg.name || "",
        clinic: pkg.clinic || "",
        source: packSource(pkg),
        packageId: packageIdOf(pkg, session),
        treatmentId: pkg.id,
        sessionId: session.id,
        note: session.note || "",
        photo: session.photo || null,
        session,
        package: pkg,
      });
    }
  }
  return items.sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });
}

export function sortClosedPackages(packages, now = new Date()) {
  return [...packages].sort((a, b) => {
    const ad = a.expiryDate || lastSessionDate(a) || "";
    const bd = b.expiryDate || lastSessionDate(b) || "";
    const at = ad ? new Date(ad).getTime() : 0;
    const bt = bd ? new Date(bd).getTime() : 0;
    if (bt !== at) return bt - at;
    const ar = closedPackageReason(a, now);
    const br = closedPackageReason(b, now);
    return String(ar || "").localeCompare(String(br || ""));
  });
}
