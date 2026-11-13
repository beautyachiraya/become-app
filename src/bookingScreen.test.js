import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { BookingScreen } from "./BookingScreen";
import { BOOKING_COPY } from "./bookingCopy";
import { TAB_CLEARANCE, tabClearanceCoversBar } from "./shellLayout";
import { bookingSummaryText } from "./visits";

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
    expect(html).toContain('type="date"');
    expect(html).toContain("lining-nums");
    expect(html).toContain("DM Sans");
    expect(html).toContain("-webkit-text-fill-color:#1C1612");
    expect(html).not.toMatch(/type="date"[^>]*Cormorant/);
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

  it("labels the no-expiry track Per visit on a planned visit", () => {
    const perVisit = pack({
      id: "j1",
      name: "Botox",
      clinic: "Glow Clinic",
      trackMode: "journal",
      status: "active",
      totalSessions: null,
      expiryDate: null,
      sessions: [],
    });
    const html = visible(screen({
      openPacks: [perVisit],
      treatments: [perVisit],
      visits: [{
        id: "v1",
        packageId: "j1",
        clinicName: "Glow Clinic",
        treatmentName: "Botox",
        plannedAt: "2026-10-12",
        status: "planned",
      }],
    }));
    expect(html).toContain("Per visit");
    expect(html).not.toMatch(/\bJournal\b/);
    expect(html).not.toMatch(/\bDiary\b/);
    expect(html).not.toMatch(/\d+ left/);
  });

  it("shows the success note", () => {
    const html = visible(screen({ openPacks: [pack()], treatments: [pack()], initialNotice: true }));
    expect(html).toContain("Visit planned");
    expect(html).toContain("This isn't a confirmation from the clinic.");
  });

  it("shows the full expiry year at the start of the package menu", () => {
    const html = visible(screen({
      openPacks: [pack()],
      treatments: [pack()],
      initialSheet: "plan",
    }));
    expect(html).toContain("1 Nov 2026 · Hydrafacial · 5 left");
    expect(html).not.toContain("Expires 12 May 20<");
  });

  it("clears the Visit planned note when Done is tapped and leaves the visit planned", () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCompleteVisit = jest.fn();
    const visit = {
      id: "v1",
      packageId: "p1",
      clinicName: "Pure Skin Spa",
      treatmentName: "Hydrafacial",
      plannedAt: "2026-12-12",
      status: "planned",
    };
    act(() => {
      root.render(
        <BookingScreen
          t={t}
          locale="en"
          openPacks={[pack()]}
          treatments={[pack()]}
          visits={[visit]}
          initialNotice
          onCompleteVisit={onCompleteVisit}
        />
      );
    });
    expect(container.querySelector("[data-testid=visit-success]")).not.toBeNull();
    expect(container.querySelector("[data-status=planned]")).not.toBeNull();
    const done = container.querySelector("[data-testid=visit-done]");
    act(() => { done.click(); });
    expect(onCompleteVisit).toHaveBeenCalledTimes(1);
    expect(onCompleteVisit.mock.calls[0][0].status).toBe("planned");
    expect(container.querySelector("[data-testid=visit-success]")).toBeNull();
    expect(container.querySelector("[data-status=planned]")).not.toBeNull();
    expect(container.textContent).not.toContain("Visit planned");
    act(() => root.unmount());
    container.remove();
  });

  it("does not ask for a clinic booking link on the save form", () => {
    const html = visible(screen({
      openPacks: [pack()],
      treatments: [pack()],
      initialSheet: "plan",
    }));
    expect(html).toContain("Remind me");
    expect(html).toContain("Preferred branch");
    expect(html).toContain("After you save, you'll get a message to copy and send yourself.");
    expect(html).not.toContain("Clinic booking link");
    expect(html).not.toContain("Message clinic after saving");
    expect(html).not.toContain("opens the clinic");
    expect(html).not.toContain('placeholder="https://"');
    expect(html).not.toContain('type="url"');
  });

  it("shows a copyable clinic message after saving and does not open a chat", async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSaveVisit = jest.fn(async () => true);
    const onOpenUrl = jest.fn();
    const opened = jest.spyOn(window, "open").mockImplementation(() => null);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    document.execCommand = jest.fn(() => true);
    const profile = { name: "Mali Chen", phone: "0812345678", birthday: "1997-02-20" };
    act(() => {
      root.render(
        <BookingScreen
          t={t}
          locale="th"
          openPacks={[pack({ name: "Botox", clinic: "Glow Clinic" })]}
          treatments={[pack({ name: "Botox", clinic: "Glow Clinic" })]}
          visits={[]}
          profile={profile}
          channel="line"
          onSaveVisit={onSaveVisit}
          onOpenUrl={onOpenUrl}
          initialSheet="plan"
          initialForm={{
            id: "",
            packageId: "p1",
            date: "2026-08-12",
            time: "13:00",
            notes: "",
            remind: true,
            branch: "central phuket",
            dateTouched: true,
            branchTouched: true,
          }}
        />
      );
    });
    expect(container.querySelector("[data-testid=plan-visit]").textContent).not.toContain("Clinic booking link");
    await act(async () => {
      container.querySelector("[data-testid=save-visit]").click();
    });
    expect(onSaveVisit).toHaveBeenCalledTimes(1);
    const visit = onSaveVisit.mock.calls[0][0];
    expect(visit.status).toBe("planned");
    expect(visit.branch).toBe("central phuket");
    expect(visit.bookingUrl).toBeUndefined();
    expect(onOpenUrl).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    const summary = container.querySelector("[data-testid=booking-summary]");
    expect(summary).not.toBeNull();
    expect(summary.value).toBe(bookingSummaryText({
      locale: "th",
      profile,
      visit,
      branch: "central phuket",
      date: "2026-08-12",
      time: "13:00",
    }));
    expect(summary.value).toContain("ขอทราบข้อมูลเพื่อลงนัดค่ะ");
    expect(summary.value).toContain("ชื่อ-นามสกุล : Mali Chen");
    expect(summary.value).toContain("วันเวลาที่สะดวก : 12/8 13:00");
    expect(summary.value).not.toContain("0813701551");
    const proto = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    await act(async () => {
      proto.call(summary, `${summary.value}\nเติมเอง`);
      summary.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector("[data-testid=copy-booking-summary]").click();
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("เติมเอง"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("ขอทราบข้อมูลเพื่อลงนัดค่ะ"));
    expect(container.textContent).toContain("Copied");
    act(() => root.unmount());
    container.remove();
    opened.mockRestore();
    delete document.execCommand;
  });

  it("copies the planned visit message from the booking card", async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    document.execCommand = jest.fn(() => false);
    const visit = {
      id: "v1",
      packageId: "p1",
      clinicName: "Glow Clinic",
      treatmentName: "Botox",
      plannedAt: "2026-08-12",
      status: "planned",
      branch: "central phuket",
    };
    const profile = { name: "Mali Chen", phone: "" };
    act(() => {
      root.render(
        <BookingScreen
          t={t}
          locale="en"
          openPacks={[pack({ name: "Botox", clinic: "Glow Clinic" })]}
          treatments={[pack({ name: "Botox", clinic: "Glow Clinic" })]}
          visits={[visit]}
          profile={profile}
        />
      );
    });
    expect(container.querySelector("[data-testid=copy-visit-summary]").textContent).toBe("Copy message");
    expect(container.textContent).not.toContain("Clinic page");
    expect(container.querySelector('a[href^="http"]')).toBeNull();
    await act(async () => {
      container.querySelector("[data-testid=copy-visit-summary]").click();
    });
    const expected = bookingSummaryText({ locale: "en", profile, visit });
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(expected).toContain("Full name: Mali Chen");
    expect(expected).toContain("Phone:");
    expect(expected).not.toMatch(/Phone: \d/);
    expect(container.textContent).toContain("Copied");
    act(() => root.unmount());
    container.remove();
    delete document.execCommand;
  });

  it("pads the list above the tab bar", () => {
    const html = screen({ openPacks: [pack()], treatments: [pack()] });
    expect(tabClearanceCoversBar()).toBe(true);
    expect(html).toContain(TAB_CLEARANCE);
  });
});
