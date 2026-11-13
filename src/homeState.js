/**
 * What Home is allowed to paint.
 * The first-run empty card is only for a signed-in account whose treatments
 * have finished loading and really are empty. A signed-out reload stays on
 * the doorstep and never paints that card.
 */
export function homeSurface({ signedIn, treatmentsReady, openCount, loadFailed } = {}) {
  if (!signedIn) return "doorstep";
  if (!treatmentsReady) return "loading";
  if (loadFailed) return "error";
  if (!openCount) return "empty";
  return "list";
}

export function shouldShowFirstRunEmpty(state) {
  return homeSurface(state) === "empty";
}
