const { TextDecoder, TextEncoder } = require("util");
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
if (!global.TextEncoder) global.TextEncoder = TextEncoder;

import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";
import {
  FIGURE_CSS,
  FIGURE_FONT,
  FIGURE_INK,
  META_INK,
  READABLE_CONTRAST,
  Numeral,
  SessionHeading,
  contrastOnWhite,
  dateInputStyle,
  figureInk,
  figureStyle,
  pendingDotPaint,
} from "./figureType";

const { PALETTE } = require("./become");

describe("readable numerals", () => {
  it("uses DM Sans lining figures in dark ink, not the thin serif", () => {
    const style = figureStyle({ size: 28 });
    expect(style.fontFamily).toBe(FIGURE_FONT);
    expect(style.fontFamily).not.toMatch(/Cormorant/);
    expect(style.fontWeight).toBe(600);
    expect(style.fontVariantNumeric).toBe("lining-nums tabular-nums");
    expect(style.color).toBe(FIGURE_INK);
    expect(dateInputStyle.fontWeight).toBe(600);
    expect(dateInputStyle.fontSize).toBe(16);
    expect(dateInputStyle.WebkitTextFillColor).toBe(FIGURE_INK);
    expect(dateInputStyle.fontVariantNumeric).toContain("lining-nums");
    expect(FIGURE_CSS).toContain("DM Sans");
    expect(FIGURE_CSS).toContain("lining-nums");
    expect(FIGURE_CSS).toContain('input.inp[type="date"]');
    expect(FIGURE_CSS).toContain("-webkit-datetime-edit");
    expect(FIGURE_CSS).not.toContain("Cormorant");
  });

  it("picks the darker palette ink, which clears the light accent", () => {
    PALETTE.forEach((swatch) => {
      expect(figureInk(swatch)).toBe(swatch.text);
      expect(contrastOnWhite(swatch.text)).toBeGreaterThanOrEqual(READABLE_CONTRAST);
      expect(contrastOnWhite(swatch.text)).toBeGreaterThan(contrastOnWhite(swatch.accent));
    });
    expect(contrastOnWhite(FIGURE_INK)).toBeGreaterThan(10);
    expect(contrastOnWhite(META_INK)).toBeGreaterThan(7);
    expect(contrastOnWhite("#9A8A78")).toBeLessThan(READABLE_CONTRAST);
    expect(contrastOnWhite("#8870C8")).toBeLessThan(contrastOnWhite("#504098"));
    expect(figureInk(null)).toBe(FIGURE_INK);
  });

  it("keeps a session title in the serif and the count in a lining figure", () => {
    const html = renderToStaticMarkup(<SessionHeading label="Log Session" n={1} size={30} />);
    expect(html).toContain("Log Session");
    expect(html).toContain("Cormorant");
    const numeral = html.match(/<span[^>]*data-numeral="lining"[^>]*>1<\/span>/);
    expect(numeral).not.toBeNull();
    expect(numeral[0]).toContain("DM Sans");
    expect(numeral[0]).toContain("lining-nums");
    expect(numeral[0]).not.toContain("Cormorant");
    const plain = renderToStaticMarkup(<Numeral>13 Nov 2026</Numeral>);
    expect(plain).toContain("13 Nov 2026");
    expect(plain).toContain("DM Sans");
    expect(plain).not.toContain("Cormorant");
  });

  it("draws upcoming session numbers in the dark ink, not a faint accent", () => {
    const lavender = PALETTE[3];
    const dot = pendingDotPaint(lavender);
    expect(dot.ink).toBe("#504098");
    expect(dot.futureBorder).toContain("#504098");
    expect(dot.futureBorder).not.toContain(lavender.accent);
    expect(dot.nextBorder).toBe("2px dashed #504098");
  });

  it("keeps the reported screens off the thin serif accent numbers", () => {
    const become = fs.readFileSync(path.join(__dirname, "become.jsx"), "utf8");
    const journal = fs.readFileSync(path.join(__dirname, "journalUi.jsx"), "utf8");
    expect(become).not.toContain('fontFamily:"\'Cormorant Garamond\',serif",fontSize:30,fontWeight:400,color:pal.accent');
    expect(become).not.toContain('fontFamily:"\'Cormorant Garamond\',serif",fontSize:40,fontWeight:400,color:p.accent');
    expect(become).not.toContain('fontFamily:"\'Cormorant Garamond\',serif",fontSize:22,fontWeight:400,color:isLate');
    expect(become).not.toContain("${pal.accent}35`,fontWeight");
    expect(become).not.toContain("${p.accent}40`");
    expect(become).toContain("figureInk(pal)");
    expect(become).toContain("dateInputStyle");
    expect(become).toContain("SessionHeading");
    expect(become).toContain("FIGURE_CSS");
    expect(journal).not.toContain("Cormorant");
    expect(journal).toContain("Numeral");
  });
});
