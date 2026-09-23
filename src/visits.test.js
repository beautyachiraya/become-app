import { BOOKING_COPY, findForbiddenStatusWords } from "./bookingCopy";
import {
  buildVisit,
  cancelVisit,
  clinicContact,
  completeVisit,
  draftMessage,
  earlierVisits,
  isAfterExpiry,
  lineMessageUrl,
  messageChannelForProfile,
  messageUrl,
  normalizeVisit,
  packsForBooking,
  remindTimestamp,
  suggestNextDate,
  upcomingVisits,
  whatsappMessageUrl,
  combinePlannedAt,
} from "./visits";

function pack(overrides = {}) {
  return {
    id: "p1",
    name: "Hydrafacial",
    clinic: "Pure Skin Spa",
    totalSessions: 6,
    expiryDate: "2026-11-01",
    frequency: 30,
    sessions: [{ id: 1, date: "2026-09-01" }],
    ...overrides,
  };
}

describe("booking copy", () => {
  it("uses the same keys in English and Thai", () => {
    expect(Object.keys(BOOKING_COPY.en).sort()).toEqual(Object.keys(BOOKING_COPY.th).sort());
  });

  it("never uses Confirmed, Reserved, or Booked", () => {
    expect(findForbiddenStatusWords(BOOKING_COPY)).toEqual([]);
    expect(BOOKING_COPY.en.booking_success_body).toBe("This isn't a confirmation from the clinic.");
    expect(BOOKING_COPY.en.booking_empty_body).toBe("We don't reserve the clinic's chair.");
    expect(BOOKING_COPY.en.booking_empty_title).toBe("No visits planned");
  });
});

describe("packs for a visit", () => {
  const now = new Date("2026-09-16T12:00:00");

  it("keeps open packages and active journals, and leaves used-up packs out", () => {
    const open = pack({ id: "open", sessions: [] });
    const usedUp = pack({ id: "used", totalSessions: 1, sessions: [{ id: 1, date: "2026-09-01" }] });
    const journal = pack({
      id: "journal",
      trackMode: "journal",
      status: "active",
      totalSessions: null,
      expiryDate: null,
      sessions: [],
    });
    const ids = packsForBooking([open, usedUp, journal], now).map((item) => item.id);
    expect(ids).toEqual(["open", "journal"]);
  });
});

describe("suggest and expiry", () => {
  it("suggests the last session plus the pack interval", () => {
    expect(suggestNextDate(pack())).toBe("2026-10-01");
    expect(suggestNextDate(pack({ sessions: [], frequency: 30 }))).toBeNull();
  });

  it("warns after expiry and still builds a planned visit", () => {
    expect(isAfterExpiry("2026-11-01", "2026-11-01")).toBe(false);
    expect(isAfterExpiry("2026-11-02", "2026-11-01")).toBe(true);
    const visit = buildVisit({
      id: "v1",
      pack: pack(),
      date: "2026-12-01",
      time: "14:30",
      remind: true,
      channel: "line",
      now: new Date(2026, 8, 16, 9, 0, 0),
    });
    expect(visit).not.toBeNull();
    expect(visit.status).toBe("planned");
    expect(visit.source).toBe("manual");
    expect(visit.treatmentName).toBe("Hydrafacial");
    expect(visit.clinicName).toBe("Pure Skin Spa");
    expect(visit.packageId).toBe("p1");
    expect(visit.regionMessageChannel).toBe("line");
    expect(visit.remindAt).toBeTruthy();
  });

  it("marks the visit suggested when the date is the interval date", () => {
    const visit = buildVisit({
      pack: pack(),
      date: "2026-10-01",
      time: "",
      remind: false,
      channel: "whatsapp",
    });
    expect(visit.source).toBe("suggested");
    expect(visit.plannedAt).toBe("2026-10-01");
    expect(visit.remindAt).toBeUndefined();
    expect(visit.status).toBe("planned");
  });
});

describe("remindAt", () => {
  it("reminds at 9:00 the day before when that is still ahead", () => {
    const now = new Date(2026, 8, 16, 15, 0, 0);
    const plannedAt = combinePlannedAt("2026-09-21", "14:00");
    const remind = new Date(remindTimestamp(plannedAt, now));
    expect(remind.getDate()).toBe(20);
    expect(remind.getHours()).toBe(9);
  });
});

describe("message clinic", () => {
  it("picks LINE for Thailand and WhatsApp for the UAE", () => {
    expect(messageChannelForProfile({ country: "TH" }, "AED — UAE Dirham").channel).toBe("line");
    expect(messageChannelForProfile({ country: "AE" }, "THB — Thai Baht").channel).toBe("whatsapp");
    expect(messageChannelForProfile({ countryCode: "+971 AE" }, "").channel).toBe("whatsapp");
    expect(messageChannelForProfile({}, "THB — Thai Baht ฿").channel).toBe("line");
    expect(messageChannelForProfile({}, "AED — UAE Dirham د.إ").channel).toBe("whatsapp");
    expect(messageChannelForProfile({ country: "US" }, "THB — Thai Baht").channel).toBe("none");
    expect(messageChannelForProfile({}, "USD — US Dollar $").channel).toBe("none");
  });

  it("uses a saved LINE id or WhatsApp number and never invents one", () => {
    const text = "I have 5 sessions left, expiring 1 Nov 2026.";
    const line = lineMessageUrl("@glowclinic", text);
    expect(line.startsWith("https://line.me/R/oaMessage/%40glowclinic/?")).toBe(true);
    expect(decodeURIComponent(line.split("?")[1])).toContain("5 sessions left");
    expect(lineMessageUrl("", text)).toBeNull();
    expect(lineMessageUrl("https://example.com", text)).toBeNull();

    const wa = whatsappMessageUrl("+971 50 123 4567", text);
    expect(wa.startsWith("https://wa.me/971501234567?text=")).toBe(true);
    expect(whatsappMessageUrl("12", text)).toBeNull();

    expect(messageUrl({ channel: "line", contact: { whatsappPhone: "971501234567" }, text })).toBeNull();
    expect(messageUrl({ channel: "none", contact: { lineOaId: "@glowclinic" }, text })).toBeNull();
    expect(messageUrl({
      channel: "whatsapp",
      contact: clinicContact({ whatsappPhone: "+971 50 123 4567" }),
      text,
    })).toContain("https://wa.me/971501234567");
  });

  it("reads become-verified or user-saved contact and ignores the user's own phone", () => {
    expect(clinicContact(
      { clinicContact: { lineOaId: "@realclinic", becomeVerified: true } },
      { phone: "+971501112233" }
    ).lineOaId).toBe("@realclinic");
    expect(clinicContact(null, { phone: "+971501112233" }).whatsappPhone).toBe("");
    expect(clinicContact({ name: "Glow" }, { phone: "0812345678" }).lineOaId).toBe("");
  });

  it("includes sessions left and expiry in the draft", () => {
    const text = draftMessage({ pack: pack({ totalSessions: 6, sessions: [{ date: "2026-09-01" }] }), plannedAt: "2026-10-12", locale: "en" });
    expect(text).toContain("5 sessions left");
    expect(text).toContain("1 Nov 2026");
    expect(text).toContain("This isn't a confirmation from the clinic.");
    expect(text).not.toMatch(/\b(confirmed|reserved|booked)\b/i);
    const thai = draftMessage({ pack: pack(), plannedAt: "2026-10-12", locale: "th" });
    expect(thai).toContain("เหลือ 5 ครั้ง");
    expect(thai).toContain("หมดอายุ");
  });
});

describe("visit status", () => {
  it("only keeps planned, canceled, or completed", () => {
    const coerced = normalizeVisit({ id: "v9", status: "confirmed", packageId: 3, treatmentName: "Botox" });
    expect(coerced.status).toBe("planned");
    expect(JSON.stringify(coerced)).not.toMatch(/confirmed/i);
    const planned = buildVisit({ id: "v1", pack: pack(), date: "2026-10-12", channel: "line" });
    expect(completeVisit(planned).status).toBe("completed");
    expect(cancelVisit(planned).status).toBe("canceled");
    expect(upcomingVisits([planned, completeVisit(planned), cancelVisit({ ...planned, id: "v2" })]).map((v) => v.id)).toEqual(["v1"]);
    expect(earlierVisits([
      completeVisit(planned),
      cancelVisit({ ...planned, id: "v2" }),
      { ...planned, id: "v3", status: "confirmed" },
    ]).map((v) => v.status).sort()).toEqual(["canceled", "completed"]);
  });
});
