/**
 * The fixed tab bar is 10px + a 50px center button + 26px, and its shadow
 * sits above that. Clearance must be taller than the bar so the last Home
 * card and the add control stay tappable on a phone and on a desktop column.
 */
export const TAB_BAR_BLOCK_PX = 110;
export const TAB_CLEARANCE_PX = 168;
export const TAB_CLEARANCE = `calc(${TAB_CLEARANCE_PX}px + env(safe-area-inset-bottom, 0px))`;

export function tabClearanceCoversBar(clearancePx = TAB_CLEARANCE_PX, barPx = TAB_BAR_BLOCK_PX) {
  return Number(clearancePx) > Number(barPx);
}
