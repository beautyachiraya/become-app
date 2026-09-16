import {
  HISTORY_TAB_LABEL,
  HISTORY_EMPTY_COPY,
  HOME_EMPTY_PACKAGE_COPY,
  normalizeSource,
  defaultExpiresAt,
  normalizePackage,
  mergeLedgerAndTreatments,
  sortOpenPacks,
  isNeedsAttention,
  collectSessions,
  buildHistoryEvents,
  filterHistoryEvents,
  packageFinishedSubline,
  toLedgerPackageDoc,
  toLedgerSessionDoc,
  PREVIEW_FIXTURES,
} from "./packageLedger";
import { PACKAGE_EXPIRY_DAYS } from "./packageExpiry";

const NOW = new Date("2026-09-16T12:00:00");

function pack(overrides) {
  return {
    id: 1,
    clinic: "Glow Clinic Bangkok",
    treatment: "Laser Hair Removal",
    sessionsTotal: 8,
    sessionsRemaining: 5,
    source: "paid",
    expiresAt: "2026-12-31",
    ...overrides,
  };
}

describe("copy", () => {
  it("uses History empty copy and Home first-package CTA", () => {
    expect(HISTORY_TAB_LABEL).toBe("History");
    expect(HISTORY_TAB_LABEL.toLowerCase()).not.toContain("past");
    expect(HISTORY_EMPTY_COPY).toBe(
      "No history yet. When you finish a session or a package, it shows up here."
    );
    expect(HOME_EMPTY_PACKAGE_COPY).toBe("Add your first package");
    expect(HISTORY_EMPTY_COPY.toLowerCase()).not.toContain("past");
  });
});

describe("source and expiry defaults", () => {
  it("treats unknown source as paid so promo is never assumed", () => {
    expect(normalizeSource("promo")).toBe("promo");
    expect(normalizeSource("paid")).toBe("paid");
    expect(normalizeSource(undefined)).toBe("paid");
  });

  it("gives promo packs a shorter default life than paid packs", () => {
    expect(PACKAGE_EXPIRY_DAYS.promo).toBe(90);
    expect(PACKAGE_EXPIRY_DAYS.paid).toBe(180);
    const from = new Date("2026-09-16T00:00:00");
    expect(defaultExpiresAt("promo", from)).toBe("2026-12-15");
    expect(defaultExpiresAt("paid", from)).toBe("2027-03-15");
  });
});

describe("Home: open packs only, soonest expiry first", () => {
  it("keeps promo and paid as separate cards even at the same clinic", () => {
    const promo = pack({ id: 1, source: "promo", sessionsRemaining: 3, expiresAt: "2026-10-01" });
    const paid = pack({ id: 2, source: "paid", sessionsRemaining: 5, expiresAt: "2026-12-31" });
    const open = sortOpenPacks([promo, paid], NOW);
    expect(open).toHaveLength(2);
    expect(open.map((p) => p.source)).toEqual(["promo", "paid"]);
    expect(open[0].id).toBe(1);
  });

  it("sorts soonest-expiring open pack first", () => {
    const later = pack({ id: "b", expiresAt: "2026-12-31" });
    const sooner = pack({ id: "a", source: "promo", expiresAt: "2026-10-01" });
    expect(sortOpenPacks([later, sooner], NOW).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("never puts used_up or expired packs on Home", () => {
    const usedUp = pack({
      id: 3,
      sessionsTotal: 3,
      sessionsRemaining: 0,
      expiresAt: "2026-12-31",
    });
    const expired = pack({
      id: 4,
      source: "promo",
      sessionsRemaining: 2,
      expiresAt: "2026-06-01",
    });
    const open = pack({ id: 5, sessionsRemaining: 4, expiresAt: "2026-11-01" });
    expect(sortOpenPacks([usedUp, expired, open], NOW).map((p) => p.id)).toEqual([5]);
    expect(normalizePackage(usedUp, NOW).status).toBe("used_up");
    expect(normalizePackage(expired, NOW).status).toBe("expired");
  });

  it("flags needs-attention only for open packs expiring within 30 days", () => {
    expect(isNeedsAttention(pack({ expiresAt: "2026-09-30" }), NOW)).toBe(true);
    expect(isNeedsAttention(pack({ sessionsRemaining: 0, expiresAt: "2026-09-20" }), NOW)).toBe(false);
    expect(isNeedsAttention(pack({ expiresAt: "2026-06-01" }), NOW)).toBe(false);
  });
});

describe("derive from treatments when ledger collections are empty", () => {
  it("maps totalSessions / nested sessions / expiryDate onto the ledger shape", () => {
    const treatment = {
      id: 42,
      name: "Botox",
      clinic: "Aesthetic Studio",
      totalSessions: 3,
      expiryDate: "2026-11-01",
      source: "paid",
      sessions: [{ id: 1, date: "2026-02-20", note: "20 units" }],
    };
    const p = normalizePackage(treatment, NOW);
    expect(p.sessionsTotal).toBe(3);
    expect(p.sessionsRemaining).toBe(2);
    expect(p.treatment).toBe("Botox");
    expect(p.expiresAt).toBe("2026-11-01");
    expect(p.status).toBe("open");
    expect(p.source).toBe("paid");
  });

  it("lets a ledger doc win remaining/source without merging two purchases", () => {
    const treatments = [
      { id: 1, name: "Laser", clinic: "Glow", totalSessions: 8, expiryDate: "2026-12-31", sessions: [] },
      { id: 2, name: "Laser", clinic: "Glow", totalSessions: 5, expiryDate: "2026-10-01", source: "promo", sessions: [] },
    ];
    const ledger = [
      { id: 2, treatment: "Laser", clinic: "Glow", sessionsTotal: 5, sessionsRemaining: 5, source: "promo", expiresAt: "2026-10-01" },
    ];
    const merged = mergeLedgerAndTreatments(ledger, treatments, NOW);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.id === 1).source).toBe("paid");
    expect(merged.find((p) => p.id === 2).source).toBe("promo");
  });
});

describe("History timeline", () => {
  const open = pack({ id: 10, sessionsRemaining: 4, expiresAt: "2026-12-31" });
  const usedUp = pack({
    id: 11,
    sessionsTotal: 3,
    sessionsRemaining: 0,
    source: "paid",
    expiresAt: "2026-11-01",
  });
  const expired = pack({
    id: 12,
    source: "promo",
    sessionsTotal: 4,
    sessionsRemaining: 2,
    expiresAt: "2026-06-01",
  });
  const sessions = [
    { id: 1, packageId: 10, treatment: "Laser Hair Removal", clinic: "Glow Clinic Bangkok", usedAt: "2026-09-10", sourceAtUse: "paid", notes: "Still going" },
    { id: 2, packageId: 11, treatment: "Botox", clinic: "Aesthetic Studio", usedAt: "2026-08-20T14:30:00", sourceAtUse: "paid", notes: "Last session of this pack" },
    { id: 3, packageId: 12, treatment: "LED Therapy", clinic: "Glow Clinic Bangkok", usedAt: "2026-04-12", sourceAtUse: "promo", notes: "" },
  ];

  it("mixes used sessions with used_up/expired packages, newest first", () => {
    const events = buildHistoryEvents({ packages: [open, usedUp, expired], sessions, now: NOW });
    expect(events.map((e) => e.id)).toEqual([
      "session-1",
      "session-2",
      "package-11",
      "package-12",
      "session-3",
    ]);
    expect(events.filter((e) => e.type === "package").map((e) => e.pack.status).sort()).toEqual([
      "expired",
      "used_up",
    ]);
  });

  it("does not list an active remaining-balance pack as a History package row", () => {
    const events = buildHistoryEvents({ packages: [open], sessions: [], now: NOW });
    expect(events).toEqual([]);
  });

  it("keeps packageId on each session so a visit can link back to its purchase", () => {
    const collected = collectSessions({
      ledgerSessions: [],
      packages: [],
      treatments: [{
        id: 42,
        name: "Hydrafacial",
        clinic: "Pure Skin Spa",
        source: "promo",
        totalSessions: 6,
        sessions: [{ id: 7, date: "2026-09-10", note: "Glow" }],
      }],
    });
    expect(collected[0]).toMatchObject({
      id: 7,
      packageId: 42,
      treatment: "Hydrafacial",
      clinic: "Pure Skin Spa",
      sourceAtUse: "promo",
      notes: "Glow",
    });
  });

  it("filters All / Sessions / Packages without renaming History", () => {
    const events = buildHistoryEvents({ packages: [open, usedUp, expired], sessions, now: NOW });
    expect(filterHistoryEvents(events, "all")).toHaveLength(5);
    expect(filterHistoryEvents(events, "sessions").every((e) => e.type === "session")).toBe(true);
    expect(filterHistoryEvents(events, "packages").map((e) => e.pack.status).sort()).toEqual([
      "expired",
      "used_up",
    ]);
  });

  it("writes used-up and expired sublines the History row expects", () => {
    expect(packageFinishedSubline(usedUp)).toBe("3 of 3 used");
    expect(packageFinishedSubline(expired)).toBe("2 left · expired");
  });
});

describe("ledger docs", () => {
  it("serialises package + session fields for Firestore", () => {
    const p = normalizePackage(pack({ id: 9, source: "promo", sessionsRemaining: 2, expiresAt: "2026-10-01" }), NOW);
    expect(toLedgerPackageDoc(p, NOW)).toEqual({
      id: 9,
      sessionsTotal: 8,
      sessionsRemaining: 2,
      source: "promo",
      expiresAt: "2026-10-01",
      status: "open",
      clinic: "Glow Clinic Bangkok",
      treatment: "Laser Hair Removal",
      treatmentId: 9,
    });
    expect(toLedgerSessionDoc({
      id: 5,
      date: "2026-09-10",
      note: "Nice",
      photo: null,
    }, p)).toEqual({
      id: 5,
      packageId: 9,
      clinic: "Glow Clinic Bangkok",
      treatment: "Laser Hair Removal",
      usedAt: "2026-09-10",
      sourceAtUse: "promo",
      notes: "Nice",
      photo: null,
    });
  });
});

describe("preview fixtures", () => {
  it("gives Home two open packs (promo first) and History mixed events", () => {
    const packs = mergeLedgerAndTreatments([], PREVIEW_FIXTURES.treatments, NOW);
    const open = sortOpenPacks(packs, NOW);
    expect(open.map((p) => [p.source, p.treatment])).toEqual([
      ["promo", "Hydrafacial"],
      ["paid", "Laser Hair Removal"],
    ]);
    const sessions = collectSessions({ treatments: PREVIEW_FIXTURES.treatments, packages: packs });
    const events = buildHistoryEvents({ packages: packs, sessions, now: NOW });
    expect(events.some((e) => e.type === "package" && e.pack.status === "used_up")).toBe(true);
    expect(events.some((e) => e.type === "package" && e.pack.status === "expired")).toBe(true);
    expect(events.some((e) => e.type === "session")).toBe(true);
    expect(open.some((p) => p.status === "used_up" || p.status === "expired")).toBe(false);
  });
});
