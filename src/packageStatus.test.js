import {
  daysUntil,
  sessionsRemaining,
  isExpiredPack,
  isOpenPack,
  isPastPack,
  isNeedsAttention,
  sessionsWithPackageId,
} from "./packageStatus";

const NOW = new Date("2026-09-16T12:00:00");

function pack(overrides) {
  return {
    id: 1,
    name: "Laser Hair Removal",
    totalSessions: 8,
    expiryDate: "2026-12-31",
    sessions: [{ id: 1, date: "2026-01-15", note: "First" }],
    ...overrides,
  };
}

describe("sessionsRemaining", () => {
  it("is totalSessions minus logged sessions (closest field to sessionsRemaining)", () => {
    expect(sessionsRemaining(pack())).toBe(7);
    expect(sessionsRemaining(pack({ sessions: new Array(8).fill({ id: 1 }) }))).toBe(0);
    expect(sessionsRemaining({ totalSessions: 3 })).toBe(3);
  });
});

describe("open vs past mapping", () => {
  it("keeps remaining>0 unexpired packs on Home", () => {
    const open = pack();
    expect(isOpenPack(open, NOW)).toBe(true);
    expect(isPastPack(open, NOW)).toBe(false);
  });

  it("moves used-up packs (0 left) to Past even if expiry is still in the future", () => {
    const usedUp = pack({
      totalSessions: 3,
      sessions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      expiryDate: "2026-12-31",
    });
    expect(sessionsRemaining(usedUp)).toBe(0);
    expect(isOpenPack(usedUp, NOW)).toBe(false);
    expect(isPastPack(usedUp, NOW)).toBe(true);
    expect(isExpiredPack(usedUp, NOW)).toBe(false);
  });

  it("moves expired packs to Past even if sessions remain", () => {
    const expired = pack({ expiryDate: "2025-09-30", totalSessions: 3, sessions: [{ id: 1 }] });
    expect(sessionsRemaining(expired)).toBe(2);
    expect(isExpiredPack(expired, NOW)).toBe(true);
    expect(isOpenPack(expired, NOW)).toBe(false);
    expect(isPastPack(expired, NOW)).toBe(true);
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
