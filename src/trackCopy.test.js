const { TextDecoder, TextEncoder } = require("util");
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
if (!global.TextEncoder) global.TextEncoder = TextEncoder;

const { T } = require("./become");

const PER_VISIT_TH = "\u0e23\u0e32\u0e22\u0e04\u0e23\u0e31\u0e49\u0e07";

const NAME_KEYS = ["track_journal", "journal_chip", "booking_journal"];

describe("per visit customer copy", () => {
  it("keeps the same keys in English and Thai", () => {
    expect(Object.keys(T.en).sort()).toEqual(Object.keys(T.th).sort());
  });

  it("names the no-expiry track Per visit in English and รายครั้ง in Thai", () => {
    expect(PER_VISIT_TH).toBe("รายครั้ง");
    NAME_KEYS.forEach((key) => {
      expect(T.en[key]).toBe("Per visit");
      expect(T.th[key]).toBe(PER_VISIT_TH);
    });
    expect(T.en.journal_helper).toBe("No session count or expiry. Log visits whenever you go.");
    expect(T.en.journal_add_sub).toBe("Per visit — no session count, no expiry.");
    expect(T.en.edit_journal_sub).toBe("Update your Per visit");
    expect(T.en.add_per_visit).toBe("Add Per visit");
    expect(T.en.history_lede).toBe("Used-up and expired packages, visits from Per visit, and the sessions you completed — newest first.");
    expect(T.en.history_empty_sub).toBe("Sessions you log show up here right away, newest first. A used-up or expired package lands here too. Per visit stays on Home.");
    expect(T.th.journal_helper).toBe("ไม่มีจำนวนเซสชันหรือวันหมดอายุ บันทึกทุกครั้งที่ไปได้เลย");
    expect(T.th.journal_add_sub).toBe("รายครั้ง — ไม่มีจำนวนเซสชัน ไม่มีวันหมดอายุ");
    expect(T.th.edit_journal_sub).toBe("แก้ไขรายครั้งของคุณ");
    expect(T.th.add_per_visit).toBe("เพิ่มรายครั้ง");
    expect(T.th.history_lede).toBe("แพ็กเกจที่ใช้ครบหรือหมดอายุ การไปจากรายครั้ง และเซสชันที่ทำไปแล้ว — ใหม่สุดอยู่บน");
    expect(T.th.history_empty_sub).toBe("เซสชันที่บันทึกจะขึ้นที่นี่ทันที ใหม่สุดอยู่บน แพ็กเกจที่ใช้ครบหรือหมดอายุก็มาอยู่ที่นี่ รายครั้งยังอยู่ที่หน้าหลัก");
  });

  it("does not show Journal, Diary, or a diary simile in either language", () => {
    ["en", "th"].forEach((lang) => {
      Object.values(T[lang]).forEach((value) => {
        const text = String(value);
        expect(text).not.toMatch(/\bjournal\b/i);
        expect(text).not.toMatch(/\bdiary\b/i);
        expect(text).not.toContain("ไดอารี่");
        expect(text).not.toContain("ไดอารี");
      });
    });
  });
});
