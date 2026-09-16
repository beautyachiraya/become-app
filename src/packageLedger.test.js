import {
  daysUntil,
  sessionsRemaining,
  derivePackageStatus,
  isOpenPack,
  isFinishedPack,
  isNeedsAttention,
  normalizeSource,
  defaultExpiryDate,
  stampPackageFields,
  attachSessionLedgerFields,
  buildHistoryTimeline,
  filterHistoryRows,
  buyMoreFormFromPack,
  mergeLedger,
} from "./packageLedger";
import { PACKAGE_EXPIRY_DAYS } from "./packageExpiry";

const NOW = new Date("2026-09-16T12:00:00");

function pack(overrides) {
  return {
    id: 1,
    name: "Laser Hair Removal",
    clinic: "Glow Clinic Bangkok",
    totalSessions: 8,
    expiryDate: "2026-12-31",
    source: "paid",
    sessions: [{ id: 1, date: "2026-01-15", note: "First" }],
    ...overrides,
  };
}

describe("sessionsRemaining", () => {
  it("counts nested sessions rather than trusting a merged remaining integer", () => {
    expect(sessionsRemaining(pack())).toBe(7);
    expect(sessionsRemaining(pack({ sessionsRemaining: 99 }))).toBe(7);
    expect(sessionsRemaining({ sessionsTotal: 4, sessionsRemaining: 2 })).toBe(2);
  });
});

describe("open vs history mapping", () => {
  it("keeps remaining>0 unexpired packs on Home, not in History as packages", () => {
    const open = pack();
    expect(isOpenPack(open, NOW)).toBe(true);
    expect(isFinishedPack(open, NOW)).toBe(false);
    expect(derivePackageStatus(open, NOW)).toBe("active");
  });

  it("archives used-up packs even if expiry is still in the future", () => {
    const usedUp = pack({
      totalSessions: 3,
      sessions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      expiryDate: "2026-12-31",
    });
    expect(sessionsRemaining(usedUp)).toBe(0);
    expect(isOpenPack(usedUp, NOW)).toBe(false);
    expect(isFinishedPack(usedUp, NOW)).toBe(true);
    expect(derivePackageStatus(usedUp, NOW)).toBe("used_up");
  });

  it("archives expired packs even if sessions remain", () => {
    const expired = pack({ expiryDate: "2025-09-30", totalSessions: 3, sessions: [{ id: 1 }] });
    expect(sessionsRemaining(expired)).toBe(2);
    expect(derivePackageStatus(expired, NOW)).toBe("expired");
    expect(isOpenPack(expired, NOW)).toBe(false);
    expect(isFinishedPack(expired, NOW)).toBe(true);
  });
});

describe("needs attention", () => {
  it("flags only open packs expiring within 30 days", () => {
    expect(daysUntil("2026-09-30", NOW)).toBe(14);
    expect(isNeedsAttention(pack({ expiryDate: "2026-09-30" }), NOW)).toBe(true);
  });

  it("does not list used-up packs as needs attention", () => {
    const usedUpSoon = pack({
      totalSessions: 1,
      sessions: [{ id: 1 }],
      expiryDate: "2026-09-20",
    });
    expect(isNeedsAttention(usedUpSoon, NOW)).toBe(false);
  });
});

describe("source", () => {
  it("keeps promo and paid distinct and does not invent a source", () => {
    expect(normalizeSource("promo")).toBe("promo");
    expect(normalizeSource("paid")).toBe("paid");
    expect(normalizeSource(undefined)).toBeNull();
    expect(stampPackageFields(pack({ source: "promo" })).source).toBe("promo");
    expect(stampPackageFields(pack({ source: "paid" })).source).toBe("paid");
  });

  it("uses temp expiry defaults: promo 90, paid 180", () => {
    expect(PACKAGE_EXPIRY_DAYS.promo).toBe(90);
    expect(PACKAGE_EXPIRY_DAYS.paid).toBe(180);
    expect(defaultExpiryDate("promo", NOW)).toBe("2026-12-15");
    expect(defaultExpiryDate("paid", NOW)).toBe("2027-03-15");
  });
});

describe("buildHistoryTimeline", () => {
  it("lists completed sessions from open packs but not the open pack itself", () => {
    const rows = buildHistoryTimeline([pack()], [], NOW);
    expect(rows.every((r) => r.kind === "session")).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].packageId).toBe(1);
    expect(rows[0].title).toBe("Laser Hair Removal · Glow Clinic Bangkok");
    expect(rows[0].source).toBe("paid");
  });

  it("mixes used-up package rows with visits, newest first, and keeps packageId", () => {
    const usedUp = pack({
      id: "botox-1",
      name: "Botox",
      clinic: "Aesthetic Studio",
      totalSessions: 2,
      source: "promo",
      sessions: [
        { id: 1, date: "2026-03-01", note: "First" },
        { id: 2, date: "2026-09-01", note: "Last visit" },
      ],
    });
    const rows = buildHistoryTimeline([usedUp], [], NOW);
    expect(rows[0].kind).toBe("package");
    expect(rows[0].status).toBe("used_up");
    expect(rows[0].subline).toBe("2 of 2 used");
    expect(rows.map((r) => r.kind)).toEqual(["package", "session", "session"]);
    expect(rows.every((r) => String(r.packageId) === "botox-1")).toBe(true);
    expect(rows[0].source).toBe("promo");
    expect(rows[1].source).toBe("promo");
  });

  it("archives expired packs with remaining as Expired, not Used up", () => {
    const expired = pack({
      id: "peel-1",
      name: "Chemical Peel",
      totalSessions: 4,
      source: "promo",
      expiryDate: "2025-09-30",
      sessions: [{ id: 1, date: "2025-06-01" }],
    });
    const rows = buildHistoryTimeline([expired], [], NOW);
    const pkg = rows.find((r) => r.kind === "package");
    expect(pkg.status).toBe("expired");
    expect(pkg.subline).toBe("3 left · expired");
    expect(rows.some((r) => r.kind === "session" && String(r.packageId) === "peel-1")).toBe(true);
  });

  it("does not merge promo and paid packs for the same clinic into one row", () => {
    const promo = pack({ id: "a", source: "promo", totalSessions: 1, sessions: [{ id: 1, date: "2026-09-01" }] });
    const paid = pack({ id: "b", source: "paid", totalSessions: 1, sessions: [{ id: 2, date: "2026-09-02" }] });
    const rows = buildHistoryTimeline([promo, paid], [], NOW);
    const packageRows = rows.filter((r) => r.kind === "package");
    expect(packageRows).toHaveLength(2);
    expect(packageRows.map((r) => r.source).sort()).toEqual(["paid", "promo"]);
  });
});

describe("filterHistoryRows", () => {
  it("filters by row kind and clinic", () => {
    const rows = [
      { kind: "session", clinic: "A" },
      { kind: "package", clinic: "A" },
      { kind: "session", clinic: "B" },
    ];
    expect(filterHistoryRows(rows, { kind: "sessions" })).toHaveLength(2);
    expect(filterHistoryRows(rows, { kind: "packages" })).toHaveLength(1);
    expect(filterHistoryRows(rows, { clinic: "B" })).toHaveLength(1);
  });
});

describe("buy more", () => {
  it("starts a new package for the same clinic and treatment without merging remaining", () => {
    const form = buyMoreFormFromPack(
      pack({ id: "old", name: "Botox", clinic: "Aesthetic Studio", sessionsRemaining: 0, source: "paid" }),
      ["Botox"]
    );
    expect(form.clinic).toBe("Aesthetic Studio");
    expect(form.name).toBe("Botox");
    expect(form.totalSessions).toBe("");
    expect(form.expiryDate).toBe("");
    expect(form.source).toBe("paid");
    expect(form).not.toHaveProperty("id");
    expect(form).not.toHaveProperty("sessions");
  });
});

describe("mergeLedger", () => {
  it("adapts treatments plus optional packages/sessions collections", () => {
    const { packs } = mergeLedger({
      treatments: [pack({ id: "t1", sessions: [] })],
      packages: [{ id: "t1", treatment: "Laser Hair Removal", clinic: "Glow Clinic Bangkok", sessionsTotal: 8, source: "promo" }],
      sessions: [{ id: 9, packageId: "t1", usedAt: "2026-09-01", sourceAtUse: "promo" }],
    }, NOW);
    expect(packs).toHaveLength(1);
    expect(packs[0].source).toBe("promo");
    expect(packs[0].sessions).toHaveLength(1);
    expect(attachSessionLedgerFields(packs[0].sessions[0], packs[0]).packageId).toBe("t1");
  });
});
