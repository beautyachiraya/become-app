import React from "react";

/**
 * Digits customers read on a phone.
 * Cormorant Garamond’s thin “1” looks like a capital I, and the light
 * treatment accent is too faint on white. These styles use DM Sans
 * semibold lining figures (a 1 with a flag and a base) in dark ink.
 * Words in Cormorant stay as they are.
 */
export const FIGURE_FONT = "'DM Sans', sans-serif";
export const FIGURE_INK = "#1C1612";
export const META_INK = "#4A3C30";
export const READABLE_CONTRAST = 4.5;

export function figureInk(palette) {
  if (palette && palette.text) return palette.text;
  return FIGURE_INK;
}

export function figureStyle({ color = FIGURE_INK, size } = {}) {
  const style = {
    fontFamily: FIGURE_FONT,
    fontWeight: 600,
    fontStyle: "normal",
    fontVariantNumeric: "lining-nums tabular-nums",
    fontFeatureSettings: '"lnum" 1, "tnum" 1',
    letterSpacing: 0,
    color,
    lineHeight: 1.15,
  };
  if (size != null) style.fontSize = size;
  return style;
}

export const dateInputStyle = {
  fontFamily: FIGURE_FONT,
  fontWeight: 600,
  fontSize: 16,
  color: FIGURE_INK,
  WebkitTextFillColor: FIGURE_INK,
  fontVariantNumeric: "lining-nums tabular-nums",
  fontFeatureSettings: '"lnum" 1, "tnum" 1',
  colorScheme: "light",
};

export function pendingDotPaint(palette) {
  const ink = figureInk(palette);
  return {
    ink,
    futureBorder: `1.5px dashed ${ink}B2`,
    nextBorder: `2px dashed ${ink}`,
  };
}

function srgb(hex, index) {
  const n = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

export function contrastOnWhite(hex) {
  const L = 0.2126 * srgb(hex, 0) + 0.7152 * srgb(hex, 1) + 0.0722 * srgb(hex, 2);
  return 1.05 / (L + 0.05);
}

export const FIGURE_CSS = `
.num{font-family:'DM Sans',sans-serif;font-weight:600;font-style:normal;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1;letter-spacing:0;}
input.inp[type="date"],input.inp[type="time"],input.inp[type="number"]{font-family:'DM Sans',sans-serif;font-weight:600;font-size:16px;color:#1C1612;-webkit-text-fill-color:#1C1612;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1;color-scheme:light;}
input.inp[type="date"]::-webkit-datetime-edit,input.inp[type="date"]::-webkit-datetime-edit-fields-wrapper,input.inp[type="date"]::-webkit-datetime-edit-text,input.inp[type="date"]::-webkit-datetime-edit-month-field,input.inp[type="date"]::-webkit-datetime-edit-day-field,input.inp[type="date"]::-webkit-datetime-edit-year-field,input.inp[type="time"]::-webkit-datetime-edit,input.inp[type="time"]::-webkit-datetime-edit-hour-field,input.inp[type="time"]::-webkit-datetime-edit-minute-field,input.inp[type="time"]::-webkit-datetime-edit-ampm-field{font-family:'DM Sans',sans-serif;font-weight:600;color:#1C1612;-webkit-text-fill-color:#1C1612;font-variant-numeric:lining-nums tabular-nums;padding:0;}
`.trim();

export function Numeral({ children, color, size, style, className, as: Tag = "span" }) {
  return (
    <Tag
      className={className ? `num ${className}` : "num"}
      data-numeral="lining"
      style={{ ...figureStyle({ color, size }), ...style }}
    >
      {children}
    </Tag>
  );
}

export function SessionHeading({ label, n, prefix, size = 28, style }) {
  return (
    <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 400, fontSize: size, color: FIGURE_INK, lineHeight: 1.15, margin: 0, ...style }}>
      {prefix ? <>{prefix} </> : null}
      {label}
      {n == null || n === "" ? null : <> <Numeral size={size}>{n}</Numeral></>}
    </h2>
  );
}
