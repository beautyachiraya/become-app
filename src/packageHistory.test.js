import {
  remainingSessions,
  packSource,
  packageIdOf,
  isExpiredPackage,
  isUsedUpPackage,
  isOpenPackage,
  isHistoryPackage,
  closedPackageReason,
  splitPackages,
  flattenCompletedSessions,
} from "./packageHistory";

const NOW = new Date("2026-09-16T12:00:00");

function pkg(overrides) {
  return {
    id: 1,
    name: "Laser Hair Removal",
    clinic: "Glow Clinic Bangkok",
    totalSessions: 8,
    expiryDate: "2026-12-31",
    sessions: [{ id: 1, date: "2026-01-15", note: "First", photo: null }],
    ...overrides,
  };
}

describe("remainingSessions", () => {
  it("uses total minus logged sessions", () => {
    expect(remainingSessions(pkg())).toBe(7);
  });

  it("prefers an explicit remaining field when present", () => {
    expect(remainingSessions(pkg({ remaining: 2, totalSessions: 8 }))).toBe(2);
  });

  it("treats used-up packs as zero remaining", () => {
    expect(
      remainingSessions(
        pkg({
          totalSessions: 2,
          sessions: [
            { id: 1, date: "2026-01-01" },
            { id: 2, date: "2026-02-01" },
          ],
        })
      )
    ).toBe(0);
  });
});

describe("packSource", () => {
  it("reads source, kind, or packType when present", () => {
    expect(packSource({ source: "Promo" })).toBe("promo");
    expect(packSource({ kind: "paid" })).toBe("paid");
    expect(packSource({ packType: "promotional" })).toBe("promo");
  });

  it("returns null when the field is missing", () => {
    expect(packSource(pkg())).toBe(null);
  });
});

describe("package status split", () => {
  const open = pkg({ id: 1, source: "paid" });
  const expired = pkg({
    id: 2,
    name: "Botox",
    expiryDate: "2025-09-30",
    totalSessions: 3,
    source: "promo",
  });
  const usedUp = pkg({
    id: 3,
    name: "Chemical Peel",
    totalSessions: 2,
    expiryDate: "2026-11-01",
    source: "paid",
    sessions: [
      { id: 10, date: "2026-04-01", packageId: 3 },
      { id: 11, date: "2026-05-01", packageId: 3 },
    ],
  });

  it("keeps packs with remaining sessions and a future expiry on Home", () => {
    expect(isOpenPackage(open, NOW)).toBe(true);
    expect(isHistoryPackage(open, NOW)).toBe(false);
  });

  it("moves expired packs to History even if sessions remain", () => {
    expect(isExpiredPackage(expired, NOW)).toBe(true);
    expect(isOpenPackage(expired, NOW)).toBe(false);
    expect(isHistoryPackage(expired, NOW)).toBe(true);
    expect(closedPackageReason(expired, NOW)).toBe("expired");
    expect(remainingSessions(expired)).toBe(2);
  });

  it("moves used-up packs to History", () => {
    expect(isUsedUpPackage(usedUp)).toBe(true);
    expect(isHistoryPackage(usedUp, NOW)).toBe(true);
    expect(closedPackageReason(usedUp, NOW)).toBe("used_up");
  });

  it("splits without dropping records", () => {
    const all = [open, expired, usedUp];
    const { open: home, closed: history } = splitPackages(all, NOW);
    expect(home.map((p) => p.id)).toEqual([1]);
    expect(history.map((p) => p.id).sort()).toEqual([2, 3]);
    expect(home.length + history.length).toBe(all.length);
  });
});

describe("flattenCompletedSessions", () => {
  it("links sessions to packageId, clinic, and treatment when available", () => {
    const items = flattenCompletedSessions([
      pkg({
        id: 9,
        packageId: 9,
        source: "promo",
        sessions: [{ id: 44, date: "2026-03-08", note: "Smoother", packageId: 9 }],
      }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      date: "2026-03-08",
      treatmentName: "Laser Hair Removal",
      clinic: "Glow Clinic Bangkok",
      source: "promo",
      packageId: 9,
      treatmentId: 9,
    });
  });

  it("falls back to the parent treatment id when session.packageId is missing", () => {
    expect(packageIdOf({ id: 5 }, { id: 1 })).toBe(5);
  });

  it("sorts completed sessions newest first", () => {
    const items = flattenCompletedSessions([
      pkg({
        sessions: [
          { id: 1, date: "2026-01-15" },
          { id: 2, date: "2026-03-08" },
        ],
      }),
    ]);
    expect(items.map((s) => s.date)).toEqual(["2026-03-08", "2026-01-15"]);
  });
});
