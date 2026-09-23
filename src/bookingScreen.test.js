import { renderToStaticMarkup } from "react-dom/server";
import { BookingScreen } from "./BookingScreen";
import { BOOKING_COPY } from "./bookingCopy";

const EXTRA = {
  booking_tab: "Booking",
  booking_title: "Booking",
  add_treatment: "Add Treatment",
  promo: "Promo",
  paid: "Paid",
};

function t(key) {
  return BOOKING_COPY.en[key] || EXTRA[key] || key;
}

function visible(html) {
  return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function pack(overrides = {}) {
  return {
    id: "p1",
    name: "Hydrafacial",
    clinic: "Pure Skin Spa",
    totalSessions: 6,
    expiryDate: "2026-11-01",
    frequency: 30,
    kind: "promo",
    palette: 2,
    sessions: [{ id: 1, date: "2026-09-01" }],
    ...overrides,
  };
}

function screen(props) {
  return renderToStaticMarkup(
    <BookingScreen
      t={t}
      locale="en"
      openPacks={[]}
      treatments={[]}
      visits={[]}
      {...props}
    />
  );
}

function buttonOpen(html, testId) {
  const match = html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`));
  return match ? !/disabled/.test(match[0]) : false;
}

describe("booking screen", () => {
  it("shows the honest empty state when there are packages and no visits", () => {
    const html = visible(screen({ openPacks: [pack()], treatments: [pack()] }));
    expect(html).toContain("No visits planned");
    expect(html).toContain("We don't reserve the clinic's chair.");
    expect(html).toContain("Plan a visit");
    expect(html).toContain("Message clinic");
    expect(html).not.toMatch(/coming soon/i);
    expect(html).not.toMatch(/\b(confirmed|reserved|booked)\b/i);
  });

  it("asks for a package when there is nothing open", () => {
    const html = visible(screen({ openPacks: [], treatments: [] }));
    expect(html).toContain("Add a package first");
    expect(html).toContain("Add Treatment");
    expect(html).not.toContain("Plan a visit");
  });

  it("shows a quiet planned card with Message and Done, and keeps Edit and Cancel in the menu", () => {
    const visit = {
      id: "v1",
      packageId: "p1",
      clinicName: "Pure Skin Spa",
      treatmentName: "Hydrafacial",
      plannedAt: "2026-10-12",
      status: "planned",
      source: "manual",
      regionMessageChannel: "line",
    };
    const html = visible(screen({ openPacks: [pack()], treatments: [pack()], visits: [visit] }));
    expect(html).toContain("Planned");
    expect(html).toContain("Hydrafacial");
    expect(html).toContain("Pure Skin Spa");
    expect(html).toContain("5 left");
    expect(html).toContain(">Message<");
    expect(html).toContain(">Done<");
    expect(html).not.toContain("Edit");
    expect(html).not.toContain("Cancel visit");
    expect(html).not.toMatch(/\b(confirmed|reserved|booked)\b/i);

    const openMenu = visible(screen({
      openPacks: [pack()],
      treatments: [pack()],
      visits: [visit],
      initialMenuId: "v1",
    }));
    expect(openMenu).toContain("Edit");
    expect(openMenu).toContain("Cancel visit");
  });

  it("turns a confirmed status into Planned and keeps canceled visits out of the action row", () => {
    const html = visible(screen({
      openPacks: [pack()],
      treatments: [pack()],
      visits: [{
        id: "bad",
        packageId: "p1",
        treatmentName: "Hydrafacial",
        clinicName: "Pure Skin Spa",
        plannedAt: "2026-10-12",
        status: "confirmed",
      }],
    }));
    expect(html).toContain("Planned");
    expect(html).toContain('data-status="planned"');
    expect(html).not.toMatch(/confirmed/i);

    const earlier = visible(screen({
      openPacks: [pack()],
      treatments: [pack()],
      visits: [{
        id: "old",
        packageId: "p1",
        treatmentName: "Hydrafacial",
        clinicName: "Pure Skin Spa",
        plannedAt: "2026-09-01",
        status: "canceled",
      }],
    }));
    expect(earlier).toContain("Canceled");
    expect(earlier).toContain('data-status="canceled"');
    expect(earlier).not.toContain(">Message<");
    expect(earlier).not.toMatch(/\b(confirmed|reserved|booked)\b/i);
  });

  it("lets a date after expiry be saved and shows the package as read-only", () => {
    const html = visible(screen({
      openPacks: [pack()],
      treatments: [pack()],
      initialSheet: "plan",
      initialForm: {
        id: "",
        packageId: "p1",
        date: "2026-12-01",
        time: "14:30",
        notes: "",
        remind: true,
        messageAfter: false,
        bookingUrl: "",
        dateTouched: true,
        linkTouched: false,
      },
    }));
    expect(html).toContain("This date is after the package expires. You can still save it.");
    expect(html).toContain("Hydrafacial");
    expect(html).toContain("Pure Skin Spa");
    expect(html).toContain("Promo");
    expect(html).toContain("5 left");
    expect(html).toContain("This isn't a confirmation from the clinic.");
    expect(buttonOpen(html, "save-visit")).toBe(true);
    expect(html).not.toMatch(/\b(confirmed|reserved|booked)\b/i);
  });

  it("asks for a saved LINE id and does not offer WhatsApp in Thailand", () => {
    const html = screen({
      channel: "line",
      initialSheet: "contact",
      initialContact: { pack: pack(), text: "Hello", lineOaId: "", whatsappPhone: "" },
    });
    expect(html).toContain("LINE Official Account ID");
    expect(html).toContain('placeholder="@clinicname"');
    expect(html).toContain("We never guess it.");
    expect(html).not.toContain('placeholder="971501234567"');
  });

  it("shows the success note", () => {
    const html = visible(screen({ openPacks: [pack()], treatments: [pack()], initialNotice: true }));
    expect(html).toContain("Visit planned");
    expect(html).toContain("This isn't a confirmation from the clinic.");
  });
});
