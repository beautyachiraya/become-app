const { TextDecoder, TextEncoder } = require("util");
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
if (!global.TextEncoder) global.TextEncoder = TextEncoder;

const { T } = require("./become");
const { homeSurface, shouldShowFirstRunEmpty } = require("./homeState");
const {
  LANGUAGE_EN,
  LANGUAGE_TH,
  readStoredLanguage,
  writeStoredLanguage,
  languageFromProfile,
  localeFromLanguage,
} = require("./language");
const { TAB_CLEARANCE_PX, TAB_BAR_BLOCK_PX, tabClearanceCoversBar } = require("./shellLayout");

describe("empty Home flash", () => {
  it("stays on the doorstep when signed out, even before treatments would have loaded", () => {
    expect(homeSurface({ signedIn: false, treatmentsReady: false, openCount: 0 })).toBe("doorstep");
    expect(shouldShowFirstRunEmpty({ signedIn: false, treatmentsReady: true, openCount: 0 })).toBe(false);
  });

  it("does not paint the first-run empty card while treatments are still loading", () => {
    const loading = { signedIn: true, treatmentsReady: false, openCount: 0, loadFailed: false };
    expect(homeSurface(loading)).toBe("loading");
    expect(shouldShowFirstRunEmpty(loading)).toBe(false);
  });

  it("shows the first-run card only after a confirmed empty load", () => {
    const empty = { signedIn: true, treatmentsReady: true, openCount: 0, loadFailed: false };
    expect(shouldShowFirstRunEmpty(empty)).toBe(true);
    expect(shouldShowFirstRunEmpty({ ...empty, openCount: 2 })).toBe(false);
    expect(homeSurface({ signedIn: true, treatmentsReady: true, openCount: 0, loadFailed: true })).toBe("error");
  });
});

describe("language choice", () => {
  function memoryStorage(initial) {
    const data = { ...initial };
    return {
      getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem(key, value) { data[key] = String(value); },
    };
  }

  it("persists the doorstep choice so a reload can restore it", () => {
    const storage = memoryStorage();
    expect(readStoredLanguage(storage)).toBe(LANGUAGE_EN);
    expect(writeStoredLanguage(storage, LANGUAGE_TH)).toBe(LANGUAGE_TH);
    expect(readStoredLanguage(storage)).toBe(LANGUAGE_TH);
    expect(localeFromLanguage(readStoredLanguage(storage))).toBe("th");
  });

  it("reads a saved profile language and ignores an unknown value", () => {
    expect(languageFromProfile({ language: LANGUAGE_TH })).toBe(LANGUAGE_TH);
    expect(languageFromProfile({ language: "th" })).toBe(LANGUAGE_TH);
    expect(languageFromProfile({ language: LANGUAGE_EN })).toBe(LANGUAGE_EN);
    expect(languageFromProfile({})).toBe("");
    expect(languageFromProfile(null)).toBe("");
  });

  it("offers Thai on the doorstep and translates profile and home chrome", () => {
    expect(T.th.door_language).toBe("ภาษา");
    expect(T.th.door_sign_in).toBe("เข้าสู่ระบบ");
    expect(T.en.door_sign_in).toBe("Sign In");
    expect(T.th.profile_title).toBe("โปรไฟล์");
    expect(T.th.profile_sign_out).toBe("ออกจากระบบ");
    expect(T.th.profile_language).toBe("ภาษา");
    expect(T.th.left_label).toBe("เหลือ");
    expect(T.th.exp_prefix).toBe("หมดอายุ");
    expect(T.th.next_prefix).toBe("ครั้งถัดไป");
    expect(T.th.hero_before).not.toMatch(/how are you/i);
    expect(T.th.booking_tab).toBe("จองคิว");
    expect(JSON.stringify(T)).not.toContain("วางแผนการไปทักคลินิก");
    expect(T.th.booking_message_clinic).toBe("ทักคลินิก");
  });
});

describe("tab bar clearance", () => {
  it("is taller than the fixed bar, including the center button", () => {
    expect(TAB_BAR_BLOCK_PX).toBeGreaterThanOrEqual(86);
    expect(tabClearanceCoversBar()).toBe(true);
    expect(TAB_CLEARANCE_PX).toBeGreaterThan(TAB_BAR_BLOCK_PX);
  });
});
