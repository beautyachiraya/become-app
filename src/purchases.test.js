import { renderToStaticMarkup } from "react-dom/server";
import { applySessionLog, isHistoryPack, isOpenPack } from "./packageStatus";
import { buildNewTreatment, emptyTreatmentForm } from "./treatmentForm";
import { BuyAgainSheet, PurchaseHistorySection } from "./purchaseUi";
import { buildEditedTreatment } from "./treatmentForm";
import {
  localISODate,
  purchaseHistory,
  purchaseHistoryIsDerivedOnly,
  topUpTreatment,
} from "./purchases";

const NOW = new Date(2026, 9, 3, 15, 0, 0);

function pack(overrides) {
  return {
    id: "laser",
    trackMode: "package",
    name: "Laser Hair Removal",
    clinic: "Glow Clinic Bangkok",
    brandUnit: "Full legs",
    totalSessions: 6,
    frequency: 42,
    frequencyLabel: "Every 6 weeks",
    expiryDate: "2026-12-31",
    palette: 0,
    notes: "Full legs",
    kind: "paid",
    bookingUrl: "https://clinic.example/book",
    sessions: [
      { id: 1, date: "2026-09-01", note: "First visit", photo: "https://example.com/a.jpg" },
    ],
    ...overrides,
  };
}

describe("original purchase", () => {
  it("records the date, sessions, and expiry when a package is first added", () => {
    const created = buildNewTreatment(
      {
        ...emptyTreatmentForm(),
        clinic: "Glow Clinic",
        totalSessions: "6",
        expiryDate: "2026-12-31",
        notes: "Full legs",
      },
      { id: 42, palette: 1, now: NOW }
    );
    expect(created.purchases).toEqual([
      { date: "2026-10-03", sessionsAdded: 6, expiryDate: "2026-12-31" },
    ]);
    expect(created.sessions).toEqual([]);
    expect(localISODate(NOW)).toBe("2026-10-03");
  });

  it("omits expiry on the receipt when the package has none", () => {
    const created = buildNewTreatment(
      { ...emptyTreatmentForm(), clinic: "Glow", totalSessions: "4", expiryDate: "" },
      { id: 1, palette: 0, now: NOW }
    );
    expect(created.purchases).toEqual([{ date: "2026-10-03", sessionsAdded: 4 }]);
  });

  it("does not put a purchase on a journal", () => {
    const created = buildNewTreatment(
      { ...emptyTreatmentForm(), trackMode: "journal", clinic: "Glow", totalSessions: "8" },
      { id: 2, palette: 0, now: NOW }
    );
    expect(created.purchases).toBeUndefined();
    expect(created.trackMode).toBe("journal");
  });

  it("still creates a separate card for an unrelated package", () => {
    const first = buildNewTreatment(
      { ...emptyTreatmentForm(), clinic: "Glow", totalSessions: "6", expiryDate: "2026-12-31" },
      { id: 1, palette: 0, now: NOW }
    );
    const second = buildNewTreatment(
      { ...emptyTreatmentForm(), name: "Botox", clinic: "Other Studio", totalSessions: "2" },
      { id: 2, palette: 1, now: NOW }
    );
    expect(second.id).not.toBe(first.id);
    expect(second.sessions).toEqual([]);
    expect(second.purchases).toEqual([{ date: "2026-10-03", sessionsAdded: 2 }]);
    expect(first.purchases[0].sessionsAdded).toBe(6);
  });
});

describe("top up", () => {
  it("adds sessions and a new expiry without a second card or losing logged visits", () => {
    const original = pack();
    const next = topUpTreatment(original, { sessionsAdded: "4", expiryDate: "2027-06-01" }, NOW);
    expect(next.id).toBe(original.id);
    expect(next.totalSessions).toBe(10);
    expect(next.expiryDate).toBe("2027-06-01");
    expect(next.sessions).toEqual(original.sessions);
    expect(next.kind).toBe("paid");
    expect(next.bookingUrl).toBe(original.bookingUrl);
    expect(next.notes).toBe("Full legs");
    expect(next.purchases).toEqual([
      { sessionsAdded: 6, expiryDate: "2026-12-31", derived: true },
      { date: "2026-10-03", sessionsAdded: 4, expiryDate: "2027-06-01" },
    ]);
    expect(original.totalSessions).toBe(6);
    expect(original.sessions).toHaveLength(1);
    expect(original.purchases).toBeUndefined();
  });

  it("keeps the expiry already on the card when the new date is left blank", () => {
    const next = topUpTreatment(
      pack({
        purchases: [{ date: "2026-08-01", sessionsAdded: 6, expiryDate: "2026-12-31" }],
      }),
      { sessionsAdded: 2, expiryDate: "" },
      NOW
    );
    expect(next.expiryDate).toBe("2026-12-31");
    expect(next.totalSessions).toBe(8);
    expect(next.purchases).toEqual([
      { date: "2026-08-01", sessionsAdded: 6, expiryDate: "2026-12-31" },
      { date: "2026-10-03", sessionsAdded: 2, expiryDate: "2026-12-31" },
    ]);
  });

  it("keeps a stored opening buy ahead of the top-up, newest first on screen", () => {
    const card = pack({
      purchases: [{ date: "2026-08-01", sessionsAdded: 6, expiryDate: "2026-12-31" }],
    });
    const next = topUpTreatment(card, { sessionsAdded: 3, expiryDate: "2027-01-15" }, NOW);
    expect(purchaseHistory(next).map((row) => row.sessionsAdded)).toEqual([3, 6]);
    expect(purchaseHistory(next)[1].date).toBe("2026-08-01");
  });

  it("brings a used-up package back to Home when sessions are added and expiry is still ahead", () => {
    const usedUp = pack({
      totalSessions: 1,
      expiryDate: "2026-12-31",
      sessions: [{ id: 1, date: "2026-09-01" }],
    });
    const today = new Date(2026, 9, 3, 12, 0, 0);
    expect(isHistoryPack(usedUp, today)).toBe(true);
    const next = topUpTreatment(usedUp, { sessionsAdded: 5, expiryDate: "" }, today);
    expect(next.sessions).toHaveLength(1);
    expect(isOpenPack(next, today)).toBe(true);
    expect(isHistoryPack(next, today)).toBe(false);
  });

  it("corrects the opening buy when the card is edited, and leaves a longer history alone", () => {
    const opened = buildNewTreatment(
      { ...emptyTreatmentForm(), clinic: "Glow", totalSessions: "6", expiryDate: "2026-12-31" },
      { id: 3, palette: 0, now: NOW }
    );
    const corrected = buildEditedTreatment(opened, {
      name: opened.name,
      clinic: opened.clinic,
      brandUnit: "",
      totalSessions: "8",
      frequency: 30,
      frequencyLabel: "Monthly",
      expiryDate: "2027-01-31",
      notes: "",
    });
    expect(corrected.totalSessions).toBe(8);
    expect(corrected.purchases).toEqual([
      { date: "2026-10-03", sessionsAdded: 8, expiryDate: "2027-01-31" },
    ]);

    const topped = topUpTreatment(opened, { sessionsAdded: 2, expiryDate: "2027-03-01" }, NOW);
    const edited = buildEditedTreatment(topped, {
      name: topped.name,
      clinic: topped.clinic,
      brandUnit: topped.brandUnit,
      totalSessions: "99",
      frequency: topped.frequency,
      frequencyLabel: topped.frequencyLabel,
      expiryDate: topped.expiryDate,
      notes: topped.notes,
    });
    expect(edited.purchases).toEqual(topped.purchases);
    expect(edited.sessions).toEqual(topped.sessions);
  });

  it("refuses a journal and a blank session count", () => {
    expect(topUpTreatment({ trackMode: "journal", id: "j", sessions: [] }, { sessionsAdded: 2 }, NOW)).toBeNull();
    expect(topUpTreatment(pack(), { sessionsAdded: "" }, NOW)).toBeNull();
    expect(topUpTreatment(pack(), { sessionsAdded: 0 }, NOW)).toBeNull();
  });
});

describe("older cards", () => {
  it("derives one undated line from the card and does not invent a date", () => {
    const legacy = pack({ purchases: undefined, totalSessions: 8, expiryDate: "2026-11-01" });
    expect(purchaseHistory(legacy)).toEqual([
      { sessionsAdded: 8, expiryDate: "2026-11-01", derived: true },
    ]);
    expect(purchaseHistoryIsDerivedOnly(legacy)).toBe(true);
    expect(JSON.stringify(purchaseHistory(legacy))).not.toContain("2026-10-03");
  });

  it("shows an empty history when there is no session count and no receipt", () => {
    expect(purchaseHistory({ id: "bare", totalSessions: 0, sessions: [] })).toEqual([]);
    expect(purchaseHistory({ id: "bare", sessions: [{ id: 1, date: "2026-01-01" }] })).toEqual([]);
    expect(purchaseHistoryIsDerivedOnly({ id: "bare", totalSessions: 0, sessions: [] })).toBe(false);
  });

  it("still opens for a logged session without writing a purchase onto the card", () => {
    const legacy = {
      id: "old",
      totalSessions: 4,
      expiryDate: "2026-12-31",
      sessions: [],
    };
    const [next] = applySessionLog([legacy], "old", { id: 9, date: "2026-10-01", note: "kept" });
    expect(next.purchases).toBeUndefined();
    expect(next.sessions).toEqual([
      { id: 9, date: "2026-10-01", note: "kept", packageId: "old" },
    ]);
    expect(next.totalSessions).toBe(4);
    expect(purchaseHistory(next)[0].derived).toBe(true);
  });

  it("snapshots the card once on the first top-up, then keeps that line", () => {
    const legacy = pack({ totalSessions: 8, expiryDate: "2026-11-01", purchases: undefined });
    const once = topUpTreatment(legacy, { sessionsAdded: 2, expiryDate: "2027-02-01" }, NOW);
    expect(once.purchases).toEqual([
      { sessionsAdded: 8, expiryDate: "2026-11-01", derived: true },
      { date: "2026-10-03", sessionsAdded: 2, expiryDate: "2027-02-01" },
    ]);
    expect(once.sessions).toEqual(legacy.sessions);
    const twice = topUpTreatment(once, { sessionsAdded: 1, expiryDate: "" }, new Date(2026, 10, 2));
    expect(twice.totalSessions).toBe(11);
    expect(twice.purchases.filter((row) => row.derived)).toHaveLength(1);
    expect(twice.sessions).toHaveLength(1);
  });

  it("reads a map-shaped purchase field the way sessions are read", () => {
    const card = pack({
      purchases: {
        1: { date: "2026-09-01", sessionsAdded: 2, expiryDate: "2027-01-01" },
        0: { date: "2026-08-01", sessionsAdded: 6, expiryDate: "2026-12-31" },
      },
    });
    expect(purchaseHistory(card).map((row) => row.date)).toEqual(["2026-09-01", "2026-08-01"]);
  });
});

describe("purchase history section", () => {
  it("lists the original buy and the top-up, and offers Buy more", () => {
    const html = renderToStaticMarkup(
      <PurchaseHistorySection
        title="Purchases"
        subtitle="Sessions added to this package, from the first buy onward."
        rows={[
          { key: "new", title: "+4 sessions", meta: "3 Oct 2026 · Exp 1 Jun" },
          { key: "old", title: "+6 sessions", meta: "1 Aug 2026 · Exp 31 Dec" },
        ]}
        buyLabel="+ Buy more"
        onBuyAgain={() => {}}
      />
    );
    expect(html).toContain("Purchases");
    expect(html).toContain("+4 sessions");
    expect(html).toContain("+6 sessions");
    expect(html).toContain("1 Aug 2026");
    expect(html).toContain("+ Buy more");
    expect(html).toContain('data-testid="buy-again"');
    expect(html).not.toContain("Aftercare");
  });

  it("says when an older card has no dated receipt", () => {
    const html = renderToStaticMarkup(
      <PurchaseHistorySection
        title="Purchases"
        subtitle="Sessions added to this package."
        note="Saved before purchases were tracked. This line is taken from the card — the date wasn't stored."
        rows={[{ key: "card", title: "+8 sessions", meta: "Date not recorded · Exp 1 Nov" }]}
        emptyLabel="Nothing saved here yet."
        buyLabel="+ Buy more"
      />
    );
    expect(html).toContain("Date not recorded");
    expect(html).toContain("before purchases were tracked");
    expect(html).not.toContain("2026-10-03");
  });

  it("shows an honest empty list when there is nothing to read", () => {
    const html = renderToStaticMarkup(
      <PurchaseHistorySection
        title="Purchases"
        subtitle="Sessions added to this package."
        emptyLabel="Nothing saved here yet."
        rows={[]}
        buyLabel="+ Buy more"
      />
    );
    expect(html).toContain('data-testid="purchase-empty"');
    expect(html).toContain("Nothing saved here yet.");
  });
});

describe("buy again sheet", () => {
  it("asks for sessions and an optional expiry", () => {
    const html = renderToStaticMarkup(
      <BuyAgainSheet
        name="Laser Hair Removal"
        clinic="Glow Clinic Bangkok"
        sessions=""
        expiryDate=""
        hint="Expires 31 Dec 2026. Leave blank to keep it."
        labels={{
          title: "Buy again",
          sessions: "How many sessions did you add?",
          sessionsPlaceholder: "e.g. 4",
          expiry: "New expiry (optional)",
          save: "Save purchase",
          saving: "Saving…",
        }}
        isSaving={false}
        onChange={() => {}}
        onSave={() => {}}
        onClose={() => {}}
      />
    );
    expect(html).toContain("Buy again");
    expect(html).toContain("How many sessions did you add?");
    expect(html).toContain("New expiry (optional)");
    expect(html).toContain("Leave blank to keep it.");
    expect(html).toContain("disabled");
  });
});
