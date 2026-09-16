import {
  buildHistoryEvents,
  filterHistoryEvents,
  historyClinics,
  HISTORY_EMPTY_COPY,
} from "./historyEvents";

const NOW = new Date("2026-09-16T12:00:00");

function pack(overrides) {
  return {
    id: 1,
    name: "Facial",
    clinic: "Clinic A",
    totalSessions: 3,
    expiryDate: "2026-12-31",
    source: "promo",
    sessions: [],
    ...overrides,
  };
}

describe("HISTORY_EMPTY_COPY", () => {
  it("names the page History and explains when rows appear", () => {
    expect(HISTORY_EMPTY_COPY).toMatch(/No history yet/i);
    expect(HISTORY_EMPTY_COPY.toLowerCase()).not.toContain("past");
    expect(HISTORY_EMPTY_COPY.toLowerCase()).toContain("session");
    expect(HISTORY_EMPTY_COPY.toLowerCase()).toContain("package");
  });
});

describe("buildHistoryEvents", () => {
  it("includes completed sessions from open packs but not the active package row", () => {
    const open = pack({
      sessions: [{ id: 11, date: "2026-09-01", note: "Glowy", sourceAtUse: "promo" }],
    });
    const events = buildHistoryEvents([open], NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "session",
      packageId: 1,
      sessionId: 11,
      treatment: "Facial",
      clinic: "Clinic A",
      source: "promo",
      notes: "Glowy",
    });
  });

  it("adds a used_up package-finished row and keeps each session linked to packageId", () => {
    const usedUp = pack({
      source: "paid",
      sessions: [
        { id: 1, date: "2026-08-01" },
        { id: 2, date: "2026-08-20" },
        { id: 3, date: "2026-09-10", note: "Last visit" },
      ],
    });
    const events = buildHistoryEvents([usedUp], NOW);
    expect(events.map((e) => e.type)).toEqual(["package", "session", "session", "session"]);
    const finished = events.find((e) => e.type === "package");
    expect(finished).toMatchObject({
      status: "used_up",
      used: 3,
      total: 3,
      remaining: 0,
      source: "paid",
      packageId: 1,
      at: "2026-09-10",
    });
    expect(events.filter((e) => e.type === "session").every((e) => e.packageId === 1)).toBe(true);
  });

  it("adds an expired package-finished row even when sessions remain", () => {
    const expired = pack({
      expiryDate: "2026-08-01",
      totalSessions: 6,
      sessions: [{ id: 1, date: "2026-07-01" }],
      source: "promo",
    });
    const events = buildHistoryEvents([expired], NOW);
    const finished = events.find((e) => e.type === "package");
    expect(finished).toMatchObject({
      type: "package",
      status: "expired",
      remaining: 5,
      used: 1,
      total: 6,
      at: "2026-08-01",
      source: "promo",
    });
  });

  it("sorts newest first and does not merge two purchases of the same treatment", () => {
    const promo = pack({
      id: 10,
      source: "promo",
      totalSessions: 1,
      sessions: [{ id: 1, date: "2026-09-12" }],
    });
    const paid = pack({
      id: 11,
      source: "paid",
      clinic: "Clinic B",
      totalSessions: 1,
      sessions: [{ id: 2, date: "2026-09-14" }],
    });
    const events = buildHistoryEvents([promo, paid], NOW);
    const packages = events.filter((e) => e.type === "package");
    expect(packages).toHaveLength(2);
    expect(packages[0].packageId).toBe(11);
    expect(packages[0].source).toBe("paid");
    expect(packages[1].packageId).toBe(10);
    expect(packages[1].source).toBe("promo");
  });
});

describe("filterHistoryEvents", () => {
  const events = buildHistoryEvents([
    pack({
      id: 1,
      clinic: "Clinic A",
      totalSessions: 1,
      sessions: [{ id: 1, date: "2026-09-10" }],
    }),
    pack({
      id: 2,
      name: "Botox",
      clinic: "Clinic B",
      source: "paid",
      expiryDate: "2025-01-01",
      sessions: [{ id: 9, date: "2025-01-01" }],
    }),
  ], NOW);

  it("filters by event type and optional clinic", () => {
    expect(filterHistoryEvents(events, { kind: "sessions" }).every((e) => e.type === "session")).toBe(true);
    expect(filterHistoryEvents(events, { kind: "packages" }).every((e) => e.type === "package")).toBe(true);
    expect(filterHistoryEvents(events, { clinic: "Clinic B" }).every((e) => e.clinic === "Clinic B")).toBe(true);
  });

  it("lists unique clinics for the optional clinic filter", () => {
    expect(historyClinics(events)).toEqual(["Clinic A", "Clinic B"]);
  });
});
