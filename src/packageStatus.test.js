import {
  daysUntil,
  sessionsRemaining,
  isExpiredPack,
  isOpenPack,
  isHistoryPack,
  isNeedsAttention,
  sessionsWithPackageId,
  packKind,
  compareExpirySoonest,
  buildHistoryTimeline,
  sortOpenPacks,
  isUsedUp,
  sessionKind,
  filterHistoryTimeline,
  buyMorePrefill,
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

describe("open vs history mapping", () => {
  it("keeps remaining>0 unexpired packs on Home", () => {
    const open = pack();
    expect(isOpenPack(open, NOW)).toBe(true);
    expect(isHistoryPack(open, NOW)).toBe(false);
  });

  it("moves used-up packs (0 left) to History even if expiry is still in the future", () => {
    const usedUp = pack({
      totalSessions: 3,
      sessions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      expiryDate: "2026-12-31",
    });
    expect(sessionsRemaining(usedUp)).toBe(0);
    expect(isOpenPack(usedUp, NOW)).toBe(false);
    expect(isHistoryPack(usedUp, NOW)).toBe(true);
    expect(isExpiredPack(usedUp, NOW)).toBe(false);
  });

  it("moves expired packs to History even if sessions remain", () => {
    const expired = pack({ expiryDate: "2025-09-30", totalSessions: 3, sessions: [{ id: 1 }] });
    expect(sessionsRemaining(expired)).toBe(2);
    expect(isExpiredPack(expired, NOW)).toBe(true);
    expect(isOpenPack(expired, NOW)).toBe(false);
    expect(isHistoryPack(expired, NOW)).toBe(true);
  });

  it("sorts Home open packs soonest-expiry first", () => {
    const later = pack({ id: 1, expiryDate: "2026-12-31" });
    const sooner = pack({ id: 2, expiryDate: "2026-10-01" });
    const none = pack({ id: 3, expiryDate: "" });
    expect([later, none, sooner].sort(compareExpirySoonest).map((p) => p.id)).toEqual([2, 1, 3]);
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

describe("promo vs paid", () => {
  it("defaults missing kind to paid and never merges promo with paid remaining", () => {
    const promo = pack({ id: 10, name: "Botox", kind: "promo", totalSessions: 2, sessions: [] });
    const paid = pack({ id: 11, name: "Botox", kind: "paid", totalSessions: 3, sessions: [] });
    const leftover = pack({ id: 12, name: "Botox", totalSessions: 1, sessions: [] });
    expect(packKind(promo)).toBe("promo");
    expect(packKind(paid)).toBe("paid");
    expect(packKind(leftover)).toBe("paid");
    const open = [promo, paid, leftover].filter((p) => isOpenPack(p, NOW));
    expect(open).toHaveLength(3);
    expect(open.map(sessionsRemaining)).toEqual([2, 3, 1]);
  });
});

describe("history timeline", () => {
  it("mixes used-up packs, expired packs, and completed sessions newest-first", () => {
    const usedUp = pack({
      id: 4,
      name: "Chemical Peel",
      kind: "paid",
      totalSessions: 2,
      expiryDate: "2026-12-01",
      sessions: [
        { id: 1, date: "2026-04-01", note: "First" },
        { id: 2, date: "2026-07-01", note: "Last" },
      ],
    });
    const expired = pack({
      id: 2,
      name: "Botox",
      kind: "promo",
      totalSessions: 3,
      expiryDate: "2025-09-30",
      sessions: [{ id: 1, date: "2025-12-01", note: "20 units" }],
    });
    const items = buildHistoryTimeline([usedUp, expired], NOW);
    expect(items.map((row) => row.type + ":" + row.packageId + ":" + (row.date || ""))).toEqual([
      "pack:4:2026-07-01",
      "session:4:2026-07-01",
      "session:4:2026-04-01",
      "session:2:2025-12-01",
      "pack:2:2025-09-30",
    ]);
    expect(items.filter((row) => row.packageId === 2).every((row) => row.kind === "promo")).toBe(true);
    expect(items.filter((row) => row.packageId === 4).every((row) => row.kind === "paid")).toBe(true);
  });

  it("lists completed sessions from still-open packs and never a package row for them", () => {
    const open = pack({
      id: 10,
      name: "Hydrafacial",
      kind: "promo",
      totalSessions: 6,
      expiryDate: "2026-11-01",
      sessions: [{ id: 1, date: "2026-03-10", note: "glow", sourceAtUse: "promo" }],
    });
    const items = buildHistoryTimeline([open], NOW);
    expect(items.filter((row) => row.type === "pack")).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("session");
    expect(items[0].kind).toBe("promo");
    expect(items[0].packageId).toBe(10);
  });

  it("is empty when nothing has been logged, used up, or expired", () => {
    expect(buildHistoryTimeline([pack({ sessions: [], expiryDate: "2027-01-01" })], NOW)).toEqual([]);
  });
});

describe("sessionKind and filters", () => {
  it("prefers sourceAtUse on the visit over the current pack kind", () => {
    const paidPack = pack({ kind: "paid" });
    expect(sessionKind({ sourceAtUse: "promo" }, paidPack)).toBe("promo");
    expect(sessionKind({ sourceAtUse: "paid" }, { kind: "promo" })).toBe("paid");
    expect(sessionKind({}, { kind: "promo" })).toBe("promo");
    expect(sessionKind({}, {})).toBe("paid");
  });

  it("filters All | Sessions | Packages", () => {
    const usedUp = pack({
      id: 4,
      totalSessions: 1,
      sessions: [{ id: 1, date: "2026-07-01" }],
    });
    const all = buildHistoryTimeline([usedUp], NOW);
    expect(filterHistoryTimeline(all, "all").map((row) => row.type)).toEqual(["pack", "session"]);
    expect(filterHistoryTimeline(all, "sessions").every((row) => row.type === "session")).toBe(true);
    expect(filterHistoryTimeline(all, "packages").every((row) => row.type === "pack")).toBe(true);
  });
});

describe("Home open packs", () => {
  it("keeps two open packs with the same clinic and treatment as two cards", () => {
    const promo = pack({ id: 50, name: "Botox", clinic: "Glow", kind: "promo", expiryDate: "2026-10-01", sessions: [] });
    const paid = pack({ id: 51, name: "Botox", clinic: "Glow", kind: "paid", expiryDate: "2026-12-15", sessions: [] });
    const ordered = sortOpenPacks([paid, promo], NOW);
    expect(ordered.map((p) => p.id)).toEqual([50, 51]);
    expect(ordered.map(sessionsRemaining)).toEqual([8, 8]);
  });

  it("does not list used-up or expired packs on Home", () => {
    const openSoon = pack({ id: 50, expiryDate: "2026-10-01", sessions: [] });
    const usedUp = pack({ id: 20, totalSessions: 1, sessions: [{ id: 1 }] });
    const expired = pack({ id: 40, expiryDate: "2025-09-30", sessions: [] });
    expect(sortOpenPacks([expired, usedUp, openSoon], NOW).map((p) => p.id)).toEqual([50]);
    expect(isUsedUp(usedUp)).toBe(true);
    expect(isUsedUp(openSoon)).toBe(false);
  });
});

describe("Buy more starts a new package", () => {
  it("prefills clinic and treatment but does not copy the finished kind or sessions", () => {
    const usedPromo = pack({
      id: 30,
      name: "Laser Hair Removal",
      clinic: "Glow Clinic Bangkok",
      kind: "promo",
      totalSessions: 3,
      sessions: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    const draft = buyMorePrefill(usedPromo);
    expect(draft.clinic).toBe("Glow Clinic Bangkok");
    expect(draft.name).toBe("Laser Hair Removal");
    expect(draft.totalSessions).toBe("3");
    expect(draft.kind).toBe("paid");
    expect(draft.expiryDate).toBe("");
    expect(draft.sessions).toBeUndefined();
    expect(usedPromo.kind).toBe("promo");
    expect(usedPromo.sessions).toHaveLength(3);
  });
});
