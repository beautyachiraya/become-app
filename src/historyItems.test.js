import {
  getSessions,
  getTotalSessions,
  getRemainingSessions,
  getExpiryDate,
  getPackageSource,
  isExpiredPackage,
  isUsedUpPackage,
  isActivePackage,
  isHistoryPackage,
  lastSessionDate,
  partitionTreatments,
  completedSessions,
  hasHistoryItems,
} from "./historyItems";

const laser = {
  id: 1,
  name: "Laser Hair Removal",
  clinic: "Glow Clinic Bangkok",
  totalSessions: 8,
  expiryDate: "2026-12-31",
  palette: 0,
  sessions: [
    { id: 1, date: "2026-01-15", note: "First session" },
    { id: 2, date: "2026-02-26", note: "Less hair" },
    { id: 3, date: "2026-03-08", note: "Smoother" },
  ],
};

const usedUpBotox = {
  id: 2,
  name: "Botox",
  clinic: "Aesthetic Studio",
  totalSessions: 1,
  expiryDate: "2026-09-30",
  palette: 1,
  sessions: [{ id: 10, date: "2026-04-01", note: "20 units" }],
};

const emptyHydra = {
  id: 3,
  name: "Hydrafacial",
  clinic: "Pure Skin Spa",
  totalSessions: 6,
  sessions: [],
};

describe("current treatment schema", () => {
  it("counts remaining from nested sessions vs totalSessions", () => {
    expect(getSessions(laser)).toHaveLength(3);
    expect(getTotalSessions(laser)).toBe(8);
    expect(getRemainingSessions(laser)).toBe(5);
    expect(isUsedUpPackage(laser)).toBe(false);
    expect(isActivePackage(laser)).toBe(true);
  });

  it("treats a fully used package as History material", () => {
    expect(getRemainingSessions(usedUpBotox)).toBe(0);
    expect(isUsedUpPackage(usedUpBotox)).toBe(true);
    expect(isActivePackage(usedUpBotox)).toBe(false);
  });

  it("does not send an unused new package to History", () => {
    expect(getRemainingSessions(emptyHydra)).toBe(6);
    expect(isUsedUpPackage(emptyHydra)).toBe(false);
    expect(isHistoryPackage(emptyHydra, new Date("2026-09-16"))).toBe(false);
  });

  it("keeps packages with missing totals on the active list", () => {
    const draft = { id: 9, name: "Other", sessions: [] };
    expect(getTotalSessions(draft)).toBe(0);
    expect(isUsedUpPackage(draft)).toBe(false);
  });
});

describe("future package-ledger fields", () => {
  it("reads sessionsTotal / sessionsRemaining when present", () => {
    const pack = {
      id: "p1",
      name: "PRP",
      sessionsTotal: 4,
      sessionsRemaining: 1,
      sessions: [{ id: 1, date: "2026-02-01" }],
    };
    expect(getTotalSessions(pack)).toBe(4);
    expect(getRemainingSessions(pack)).toBe(1);
    expect(isUsedUpPackage(pack)).toBe(false);
  });

  it("honours an explicit finished status even if session counts lag", () => {
    const pack = {
      id: "p2",
      name: "Filler",
      sessionsTotal: 3,
      sessionsRemaining: 3,
      status: "used_up",
      sessions: [],
    };
    expect(isUsedUpPackage(pack)).toBe(true);
  });

  it("reads source promo|paid when present and ignores other values", () => {
    expect(getPackageSource({ source: "promo" })).toBe("promo");
    expect(getPackageSource({ source: "Paid" })).toBe("paid");
    expect(getPackageSource({ kind: "promotional" })).toBe("promo");
    expect(getPackageSource({ name: "Laser" })).toBe(null);
    expect(getPackageSource({ source: "clinic" })).toBe(null);
  });

  it("reads expiresAt as well as expiryDate", () => {
    expect(getExpiryDate({ expiresAt: "2026-01-01" })).toBe("2026-01-01");
    expect(getExpiryDate({ expiryDate: "2026-12-31" })).toBe("2026-12-31");
  });
});

describe("partition and History lists", () => {
  const today = new Date("2026-09-16T12:00:00");
  const all = [laser, usedUpBotox, emptyHydra];

  it("keeps in-progress packages on the active list and used-up ones in History", () => {
    const { active, finished } = partitionTreatments(all, today);
    expect(active.map((t) => t.id)).toEqual([1, 3]);
    expect(finished.map((t) => t.id)).toEqual([2]);
  });

  it("moves expired packages to History even when sessions remain", () => {
    const expiredWithRemaining = {
      ...laser,
      id: 44,
      expiryDate: "2026-01-01",
    };
    expect(isExpiredPackage(expiredWithRemaining, today)).toBe(true);
    expect(isUsedUpPackage(expiredWithRemaining)).toBe(false);
    expect(isActivePackage(expiredWithRemaining, today)).toBe(false);
    expect(isHistoryPackage(expiredWithRemaining, today)).toBe(true);
    const { active, finished } = partitionTreatments([laser, expiredWithRemaining], today);
    expect(active.map((t) => t.id)).toEqual([1]);
    expect(finished.map((t) => t.id)).toEqual([44]);
  });

  it("treats an explicit expired status as History", () => {
    const pack = { id: 7, name: "PRP", status: "expired", totalSessions: 4, sessions: [] };
    expect(isExpiredPackage(pack, today)).toBe(true);
    expect(isHistoryPackage(pack, today)).toBe(true);
  });

  it("sorts finished packages by most recent session first", () => {
    const older = {
      ...usedUpBotox,
      id: 20,
      sessions: [{ id: 1, date: "2025-01-01" }],
    };
    const newer = {
      ...usedUpBotox,
      id: 21,
      sessions: [{ id: 1, date: "2026-06-01" }],
    };
    const { finished } = partitionTreatments([older, newer]);
    expect(finished.map((t) => t.id)).toEqual([21, 20]);
  });

  it("lists completed sessions newest first across packages", () => {
    const rows = completedSessions(all);
    expect(rows).toHaveLength(4);
    expect(rows[0].date).toBe("2026-04-01");
    expect(rows[0].treatmentName).toBe("Botox");
    expect(rows[0].sessionNumber).toBe(1);
    expect(rows[1].date).toBe("2026-03-08");
    expect(rows[1].sessionNumber).toBe(3);
    expect(rows.map((r) => r.date)).toEqual([
      "2026-04-01",
      "2026-03-08",
      "2026-02-26",
      "2026-01-15",
    ]);
  });

  it("has History items when there are completed sessions even if no package is used up", () => {
    expect(hasHistoryItems([laser])).toBe(true);
    expect(hasHistoryItems([emptyHydra])).toBe(false);
    expect(hasHistoryItems([])).toBe(false);
  });

  it("uses last session date for a used-up package", () => {
    expect(lastSessionDate(usedUpBotox)).toBe("2026-04-01");
    expect(lastSessionDate(emptyHydra)).toBe(null);
  });

  it("tolerates a missing treatments array", () => {
    expect(partitionTreatments(null)).toEqual({ active: [], finished: [] });
    expect(completedSessions(undefined)).toEqual([]);
    expect(getSessions(null)).toEqual([]);
  });
});
