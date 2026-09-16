import {
  daysUntil,
  sessionsRemaining,
  isExpiredPack,
  isOpenPack,
  isFinishedPack,
  isNeedsAttention,
  packStatus,
  packSource,
  sessionsWithPackageId,
  sortOpenPacks,
} from "./packageStatus";

const NOW = new Date("2026-09-16T12:00:00");

function pack(overrides) {
  return {
    id: 1,
    name: "Laser Hair Removal",
    clinic: "Glow Clinic Bangkok",
    totalSessions: 8,
    expiryDate: "2026-12-31",
    sessions: [{ id: 1, date: "2026-01-15", note: "First" }],
    ...overrides,
  };
}

describe("sessionsRemaining", () => {
  it("is totalSessions minus logged sessions (rollup, not a merged balance)", () => {
    expect(sessionsRemaining(pack())).toBe(7);
    expect(sessionsRemaining(pack({ sessions: new Array(8).fill({ id: 1 }) }))).toBe(0);
    expect(sessionsRemaining({ totalSessions: 3 })).toBe(3);
  });
});

describe("open vs history mapping", () => {
  it("keeps remaining>0 unexpired packs on Home", () => {
    const open = pack();
    expect(isOpenPack(open, NOW)).toBe(true);
    expect(isFinishedPack(open, NOW)).toBe(false);
    expect(packStatus(open, NOW)).toBe("active");
  });

  it("moves used-up packs (0 left) to History even if expiry is still in the future", () => {
    const usedUp = pack({
      totalSessions: 3,
      sessions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      expiryDate: "2026-12-31",
    });
    expect(sessionsRemaining(usedUp)).toBe(0);
    expect(isOpenPack(usedUp, NOW)).toBe(false);
    expect(isFinishedPack(usedUp, NOW)).toBe(true);
    expect(isExpiredPack(usedUp, NOW)).toBe(false);
    expect(packStatus(usedUp, NOW)).toBe("used_up");
  });

  it("moves expired packs to History even if sessions remain", () => {
    const expired = pack({ expiryDate: "2025-09-30", totalSessions: 3, sessions: [{ id: 1 }] });
    expect(sessionsRemaining(expired)).toBe(2);
    expect(isExpiredPack(expired, NOW)).toBe(true);
    expect(isOpenPack(expired, NOW)).toBe(false);
    expect(isFinishedPack(expired, NOW)).toBe(true);
    expect(packStatus(expired, NOW)).toBe("expired");
  });

  it("treats remaining 0 as used_up even when expiry has also passed", () => {
    const both = pack({
      totalSessions: 1,
      sessions: [{ id: 1, date: "2025-01-01" }],
      expiryDate: "2025-09-30",
    });
    expect(packStatus(both, NOW)).toBe("used_up");
  });
});

describe("needs attention", () => {
  it("flags only open packs expiring within 30 days", () => {
    const expiring = pack({ expiryDate: "2026-09-30" });
    expect(daysUntil("2026-09-30", NOW)).toBe(14);
    expect(isNeedsAttention(expiring, NOW)).toBe(true);
  });

  it("does not list used-up packs as All used / needs attention", () => {
    const usedUpSoon = pack({
      totalSessions: 1,
      sessions: [{ id: 1 }],
      expiryDate: "2026-09-20",
    });
    expect(isNeedsAttention(usedUpSoon, NOW)).toBe(false);
  });

  it("does not list expired packs as needs attention", () => {
    const expired = pack({ expiryDate: "2025-09-30" });
    expect(isNeedsAttention(expired, NOW)).toBe(false);
  });
});

describe("sessionsWithPackageId", () => {
  it("keeps packageId on each redeemed visit row", () => {
    const visits = sessionsWithPackageId(pack({
      id: 42,
      sessions: [
        { id: 1, date: "2026-01-15", note: "First" },
        { id: 2, date: "2026-02-26", note: "Second" },
      ],
    }));
    expect(visits).toEqual([
      { id: 1, date: "2026-01-15", note: "First", packageId: 42 },
      { id: 2, date: "2026-02-26", note: "Second", packageId: 42 },
    ]);
  });
});

describe("packSource", () => {
  it("reads promo vs paid without merging them", () => {
    expect(packSource({ source: "promo" })).toBe("promo");
    expect(packSource({ sourceAtUse: "promo" })).toBe("promo");
    expect(packSource({ source: "paid" })).toBe("paid");
    expect(packSource({})).toBe("paid");
  });
});

describe("sortOpenPacks", () => {
  it("lists soonest-expiring open pack first and drops finished packs", () => {
    const openLate = pack({ id: 2, expiryDate: "2026-12-01" });
    const openSoon = pack({ id: 3, expiryDate: "2026-10-01" });
    const usedUp = pack({ id: 4, totalSessions: 1, sessions: [{ id: 1 }] });
    const expired = pack({ id: 5, expiryDate: "2025-01-01" });
    const noExpiry = pack({ id: 6, expiryDate: "" });
    expect(sortOpenPacks([openLate, usedUp, noExpiry, expired, openSoon], NOW).map((p) => p.id)).toEqual([
      3, 2, 6,
    ]);
  });
});
