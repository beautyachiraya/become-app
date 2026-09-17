/**
 * Lightweight in-app paths. Become is still one root component;
 * these helpers keep Home/History/Booking/Profile reachable by URL
 * without bouncing a restored Firebase session back to sign-in.
 */

const TABS = ["home", "history", "booking", "profile"];

export function tabFromPath(pathname) {
  const raw = String(pathname || "/").split("?")[0].split("#")[0];
  const parts = raw.replace(/\/+$/, "").split("/").filter(Boolean);
  const first = (parts[0] || "").toLowerCase();
  if (first === "history") return "history";
  if (first === "booking") return "booking";
  if (first === "profile") return "profile";
  return "home";
}

export function pathFromTab(tab) {
  if (tab === "history") return "/history";
  if (tab === "booking") return "/booking";
  if (tab === "profile") return "/profile";
  return "/";
}

export function isAppTab(tab) {
  return TABS.indexOf(tab) !== -1;
}

/**
 * After Firebase auth has resolved, a signed-in user stays in the app
 * on the tab that matches the URL (including /history).
 * Logged-out visitors still see sign-in — signup/reset are preserved.
 */
export function resolveAuthEntry({ authReady, user, pathname, authScreen }) {
  if (!authReady) {
    return { screen: "boot", appTab: tabFromPath(pathname) };
  }
  if (user) {
    return { screen: "app", appTab: tabFromPath(pathname) };
  }
  if (authScreen === "signup" || authScreen === "reset") {
    return { screen: authScreen, appTab: tabFromPath(pathname) };
  }
  return { screen: "login", appTab: tabFromPath(pathname) };
}

/** History nav must open History — never the New Treatment sheet. */
export function navTargetForControl(control) {
  if (control === "history") return { appTab: "history", showAdd: false, path: "/history" };
  if (control === "home") return { appTab: "home", showAdd: false, path: "/" };
  if (control === "booking") return { appTab: "booking", showAdd: false, path: "/booking" };
  if (control === "profile") return { appTab: "profile", showAdd: false, path: "/profile" };
  if (control === "add") return { appTab: null, showAdd: true, path: null };
  return null;
}
