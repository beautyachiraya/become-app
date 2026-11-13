import { copyPlainText } from "./copyText";

describe("copy plain text", () => {
  const original = navigator.clipboard;

  afterEach(() => {
    if (original === undefined) {
      delete navigator.clipboard;
    } else {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: original });
    }
    delete document.execCommand;
  });

  it("copies with the clipboard API from the tap", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    document.execCommand = jest.fn(() => false);
    const text = "ขอทราบข้อมูลเพื่อลงนัดค่ะ\n💜 Glow Clinic";
    await expect(copyPlainText(text)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(text);
    expect(document.querySelector("[data-copy-buffer]")).toBeNull();
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back to a selection copy when the clipboard API refuses", async () => {
    const writeText = jest.fn().mockRejectedValue(new Error("NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    document.execCommand = jest.fn(() => true);
    await expect(copyPlainText("line one\nline two")).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(writeText).toHaveBeenCalledWith("line one\nline two");
    expect(document.querySelector("[data-copy-buffer]")).toBeNull();
  });

  it("uses the selection copy when the clipboard API never settles", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn(() => new Promise(() => {})) },
    });
    document.execCommand = jest.fn(() => true);
    await expect(copyPlainText("still here")).resolves.toBe(true);
  });

  it("reports failure when neither copy path works", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
    });
    document.execCommand = jest.fn(() => {
      throw new Error("no copy");
    });
    await expect(copyPlainText("")).resolves.toBe(false);
  });
});