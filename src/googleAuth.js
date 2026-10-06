/**
 * Google sign-in helpers.
 * Desktop and Android browsers use a popup. A normal iPhone Safari tab also
 * uses a popup, plus a second window that never visits Google (see
 * prefersGoogleRelay). That window can read the account the Firebase handler
 * stores when Safari drops window.opener. A full-page redirect cannot: the
 * account stays in the Firebase host's storage, and the return looks empty.
 * In-app browsers and the home-screen icon still redirect.
 */

export const FIREBASE_AUTH_DOMAIN = "become-app-dde78.firebaseapp.com";

/** Live site. Redirect sign-in does not use this host as authDomain. */
export const PRODUCTION_APP_HOST = "become-app-rho.vercel.app";

export const GOOGLE_REDIRECT_INTENT_KEY = "become.googleRedirectIntent";

export const GOOGLE_REDIRECT_INCOMPLETE =
  "Google sign-in didn't finish. Please try again.";

/**
 * Google redirect always uses the Firebase auth domain, including on the live
 * site. The Vercel host is not a registered Google redirect URI — Google answers
 * https://become-app-rho.vercel.app/__/auth/handler with redirect_uri_mismatch —
 * and an earlier build that used it never left for an account picker. The
 * firebaseapp.com handler is the one Google already allows. `hostname` is
 * accepted so callers can pass the page host without choosing a domain.
 */
export function resolveAuthDomain(hostname) {
  void hostname;
  return FIREBASE_AUTH_DOMAIN;
}

export function readGoogleRedirectEnv(nav) {
  const source = nav || (typeof navigator !== "undefined" ? navigator : {});
  return {
    userAgent: source.userAgent || "",
    platform: source.platform || "",
    maxTouchPoints: source.maxTouchPoints || 0,
  };
}

function isInAppBrowser(userAgent) {
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|TikTok|LinkedInApp|MicroMessenger|GSA\//i.test(userAgent || "");
}

function isIOSDevice(source) {
  const userAgent = source.userAgent || "";
  const platform = source.platform || "";
  const maxTouchPoints = source.maxTouchPoints || 0;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

/**
 * Home-screen Safari reports `navigator.standalone`. Firebase cannot finish a
 * popup there (it opens a link and loses the window), so that case still redirects.
 */
function isStandaloneApp(source) {
  if (source.standalone === true) return true;
  if (source.standalone === false) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.standalone) return true;
  } catch (err) {
    return false;
  }
  return false;
}

/**
 * Full-page redirect only where a second window cannot bring the account back.
 *
 * The Firebase handler on become-app-dde78.firebaseapp.com can give a popup
 * account to this page through window.opener. iPhone Safari clears that link
 * when the popup follows Google. The handler then stores the account in
 * localStorage on the Firebase host. A normal Safari tab opens a second
 * window onto that host — one that never visits Google, so its opener stays
 * — and that window hands the account back. See prefersGoogleRelay.
 *
 * A full-page redirect stores the account in sessionStorage instead. The
 * login page cannot see it: getRedirectResult asks an iframe, and iPhone
 * Safari keeps that iframe's storage separate. The return has no user, and
 * the login screen paints "didn't finish" even after a real account pick.
 * authDomain stays on the Firebase host. Google rejects
 * https://become-app-rho.vercel.app/__/auth/handler with redirect_uri_mismatch.
 */
export function prefersGoogleRedirect(env) {
  const source = env || {};
  const userAgent = source.userAgent || "";
  if (isInAppBrowser(userAgent)) return true;
  if (isStandaloneApp(source)) return true;
  return false;
}

/**
 * A normal iPhone or iPad Safari tab. The account chooser is a popup. A
 * second window on the Firebase host reads the stored account after Safari
 * drops window.opener. In-app browsers and the home-screen icon cannot rely
 * on that second window, so they still redirect.
 */
export function prefersGoogleRelay(env) {
  const source = env || {};
  if (prefersGoogleRedirect(source)) return false;
  return isIOSDevice(source);
}

/**
 * The handler delivers a popup account only when window.opener is still this page.
 * A missing opener means the account never arrives, so this returns null.
 */
export function userFromPopupOpener(opener, user) {
  if (!opener || !user) return null;
  return user;
}

/** Same-origin page the phone popup loads first, then leaves for the Firebase handler. */
export const GOOGLE_AUTH_START_PATH = "/google-auth-start.html";

/** Second window. It stays on the Firebase host and never follows Google. */
export const GOOGLE_AUTH_RELAY_NAME = "become-google-relay";

export const GOOGLE_AUTH_RELAY_FRAME_ID = "become-relay";

/** Matches the firebase package this app loads. The helper reads this query. */
export const GOOGLE_AUTH_RELAY_SDK_VERSION = "10.12.0";

export const GOOGLE_AUTH_RELAY_ORIGIN = "https://" + FIREBASE_AUTH_DOMAIN;

export const GOOGLE_POPUP_URL_KEY = "become.googleHandlerUrl";

export const GOOGLE_POPUP_NAV_MESSAGE = "become-google-nav";

/** Hash the start page reads, then uses to leave for Google on its own. */
export function handlerUrlFromStartHash(hash) {
  if (!hash || typeof hash !== "string") return "";
  const raw = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  if (!raw) return "";
  try {
    return isFirebaseAuthHandlerUrl(decodeURIComponent(raw)) ? decodeURIComponent(raw) : "";
  } catch (err) {
    return isFirebaseAuthHandlerUrl(raw) ? raw : "";
  }
}

export function startPageHashUrl(origin, handlerUrl) {
  if (!origin || !isFirebaseAuthHandlerUrl(handlerUrl)) return "";
  return origin + GOOGLE_AUTH_START_PATH + "#" + encodeURIComponent(handlerUrl);
}

/** iOS and Android drop window.open once the click handler has awaited. Open first. */
export function shouldPrimeGooglePopup(env) {
  const source = env || {};
  if (prefersGoogleRedirect(source)) return false;
  const userAgent = source.userAgent || "";
  return isIOSDevice(source) || /Android/i.test(userAgent);
}

/**
 * A failed popup must not start a full-page redirect on these phones.
 * The credential would be left on the Firebase auth domain, the return would
 * have no user, and the login screen would show "didn't finish".
 */
export function redirectFallbackAllowed(env) {
  const source = env || {};
  if (isIOSDevice(source)) return false;
  if (/Android/i.test(source.userAgent || "")) return false;
  return true;
}

/** Only the Firebase auth handler may be opened from the phone popup. */
export function isFirebaseAuthHandlerUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === "https://" + FIREBASE_AUTH_DOMAIN
      && parsed.pathname === "/__/auth/handler";
  } catch (err) {
    return false;
  }
}

/**
 * The start page asks for this before it leaves for Google.
 * A message from another site, or any URL that is not the Firebase handler, is ignored.
 */
export function handlerUrlFromPopupMessage(event, expectedOrigin) {
  if (!event || event.origin !== expectedOrigin) return "";
  const data = event.data || {};
  if (data.type !== GOOGLE_POPUP_NAV_MESSAGE) return "";
  return isFirebaseAuthHandlerUrl(data.url) ? data.url : "";
}

export function takeStoredHandlerUrl(storage) {
  try {
    if (!storage) return "";
    const url = storage.getItem(GOOGLE_POPUP_URL_KEY);
    if (!isFirebaseAuthHandlerUrl(url)) return "";
    storage.removeItem(GOOGLE_POPUP_URL_KEY);
    return url;
  } catch (err) {
    return "";
  }
}

function noopPopupRelease() {}
noopPopupRelease.popup = function() { return null; };
noopPopupRelease.openRelay = function() { return null; };

/**
 * Tell the already-open start page where Google lives, without moving it.
 *
 * iPhone Safari drops window.opener when the login page assigns any new
 * address onto the popup, including a same-origin hash. After the person
 * picks an account, Google sends that window back to the Firebase handler.
 * The handler can hand the account to Become only through window.opener.
 * Letting the start page leave on its own avoids one Safari bug (the parent
 * assigning the address). It does not survive the later hop to Google on
 * iPhone. The relay window, which never visits Google, brings that account back.
 */
function publishHandlerUrl(popup, origin, handler) {
  if (!popup || !handler || !origin) return false;
  let handed = false;
  try {
    popup[GOOGLE_POPUP_URL_KEY] = handler;
    handed = true;
  } catch (err) { /* Storage and a message can still carry the address. */ }
  try {
    if (popup.sessionStorage) popup.sessionStorage.setItem(GOOGLE_POPUP_URL_KEY, handler);
    handed = true;
  } catch (err) { /* The start page can still take a message. */ }
  try {
    popup.postMessage({ type: GOOGLE_POPUP_NAV_MESSAGE, url: handler }, origin);
    handed = true;
  } catch (err) { /* Storage may already have the address. */ }
  try {
    if (popup.localStorage) popup.localStorage.setItem(GOOGLE_POPUP_URL_KEY, handler);
  } catch (err) { /* Same-origin storage is only a backup. */ }
  return handed;
}

/**
 * Open a same-origin window during the tap. When Firebase later asks for a
 * popup, hand it the handler address and let that window navigate itself.
 *
 * The parent must not assign any URL onto the popup (location.href or
 * replace), including a same-origin hash. That assignment also drops
 * window.opener. It is not enough on iPhone Safari: the popup's own hop to
 * Google drops opener too. prefersGoogleRelay covers that hop.
 *
 * Desktop does not need that head start, but it still wraps `window.open` so
 * we can see the popup Firebase opens. Google’s account page logs a
 * Cross-Origin-Opener-Policy error when anything reads `window.closed`. If
 * that read throws, Firebase’s own close check stops and the button stays on
 * “Connecting…”. `release.popup()` is how the login screen watches the window
 * without waiting on Firebase.
 *
 * The returned function closes a primed window only if Firebase never used it.
 */
export function beginGooglePopupGesture(win, prime) {
  if (!win || typeof win.open !== "function") return noopPopupRelease;
  const origin = win.location && win.location.origin ? win.location.origin : "";
  const startUrl = origin ? origin + GOOGLE_AUTH_START_PATH : "about:blank";
  let opened = null;
  if (prime) {
    try {
      opened = win.open(startUrl, "become-google-auth");
    } catch (err) {
      opened = null;
    }
    if (!opened) return noopPopupRelease;
  }
  const original = win.open;
  let settled = false;
  function restore() {
    if (win.open === wrapped) win.open = original;
  }
  function wrapped(url, target, windowFeatures) {
    restore();
    settled = true;
    const handler = isFirebaseAuthHandlerUrl(url) ? url : "";
    if (prime && opened && handler) {
      // Never assign a URL from the parent. That is the Safari opener bug.
      publishHandlerUrl(opened, origin, handler);
      try { if (target && target !== "_blank") opened.name = target; } catch (err) { /* name is optional */ }
      try { opened.focus(); } catch (err) { /* The window is already open. */ }
      return opened;
    }
    try {
      opened = original.call(win, url, target, windowFeatures);
    } catch (err) {
      opened = null;
    }
    return opened;
  }
  win.open = wrapped;
  function release() {
    restore();
    if (prime && opened && !settled) {
      try { opened.close(); } catch (err) { /* already closed */ }
    }
  }
  release.popup = function() { return opened; };
  // The relay must use the real window.open. The wrapper above is reserved
  // for the Firebase handler, and calling it would steal the account chooser.
  release.openRelay = function(url) {
    if (!url) return null;
    try {
      return original.call(win, url, GOOGLE_AUTH_RELAY_NAME);
    } catch (err) {
      return null;
    }
  };
  return release;
}

/**
 * "closed" — the person dismissed Google.
 * "open" — the account chooser is still up.
 * "unavailable" — reading `closed` threw. Chrome reports that as
 * Cross-Origin-Opener-Policy blocking `window.closed`. Firebase then never
 * settles, so the login button would stay on “Connecting…”.
 * A missing window counts as closed. Callers that have not opened one yet
 * should skip this and keep waiting.
 */
export function readPopupClosed(popup) {
  if (!popup) return "closed";
  try {
    return popup.closed ? "closed" : "open";
  } catch (err) {
    return "unavailable";
  }
}

/**
 * Resolves "closed" or "unavailable" once the popup is gone or unreadable.
 * A null popup means Firebase has not opened it yet, so that is not a cancel.
 * `stop()` drops the timer when sign-in finishes first.
 */
export function watchPopupDismissal(getPopup, options) {
  const readClosed = (options && options.readClosed) || readPopupClosed;
  const intervalMs = options && typeof options.intervalMs === "number" ? options.intervalMs : 200;
  let timer = null;
  let stopped = false;
  const promise = new Promise((resolve) => {
    function poll() {
      if (stopped) return;
      let popup = null;
      try {
        popup = typeof getPopup === "function" ? getPopup() : null;
      } catch (err) {
        popup = null;
      }
      if (popup) {
        let state = "open";
        try {
          state = readClosed(popup);
        } catch (err) {
          state = "unavailable";
        }
        if (state === "closed" || state === "unavailable") {
          resolve(state);
          return;
        }
      }
      timer = setTimeout(poll, intervalMs);
    }
    poll();
  });
  return {
    promise,
    stop() {
      stopped = true;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

function quietPopupClose(error) {
  const code = error && error.code;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";
}

/**
 * Race Firebase’s popup against the window itself.
 * Closing Google, or COOP hiding `window.closed`, returns "cancelled" without
 * waiting for Firebase’s extra grace period. A user who still finishes in the
 * popup is left for `onAuthStateChanged` — this does not cancel that request.
 */
export async function finishPopupSignIn({ signIn, getPopup, readClosed, intervalMs }) {
  const signInPromise = Promise.resolve().then(() => signIn()).then(
    (result) => ({ kind: "success", user: result && result.user }),
    (error) => ({ kind: "error", error })
  );
  const watch = typeof getPopup === "function"
    ? watchPopupDismissal(getPopup, { readClosed, intervalMs })
    : null;
  let winner;
  try {
    winner = watch
      ? await Promise.race([
        signInPromise,
        watch.promise.then((state) => ({ kind: "dismissed", state })),
      ])
      : await signInPromise;
  } finally {
    if (watch) watch.stop();
  }
  if (winner.kind === "success") return { status: "success", user: winner.user };
  if (winner.kind === "dismissed") {
    // Safari hides window.closed while the account picker is open, so this
    // can win before the person has chosen an account. Keep the sign-in.
    // whenUser resolves with that person, or null if they really cancelled.
    const whenUser = signInPromise.then(
      (result) => (result && result.kind === "success" ? result.user || null : null),
      () => null
    );
    return { status: "cancelled", reason: winner.state, whenUser };
  }
  return { status: "rejected", error: winner.error };
}

/**
 * Login screen after Continue with Google returns.
 * Cancel leaves the button up and no red line. A user who arrives after
 * Safari hid window.closed still goes Home. This never uses the incomplete banner.
 */
export function immediateGoogleScreen(outcome) {
  if (outcome && outcome.status === "success" && outcome.user) {
    return { screen: "app", message: "", user: outcome.user };
  }
  if (outcome && outcome.status === "cancelled") {
    return { screen: "login", message: "" };
  }
  return { screen: "login", message: "" };
}

/** The signed-in person, including one that finishes after the popup looked closed. */
export function userFromFinishedPick(outcome) {
  if (outcome && outcome.status === "success" && outcome.user) {
    return Promise.resolve(outcome.user);
  }
  if (outcome && outcome.whenUser && typeof outcome.whenUser.then === "function") {
    return outcome.whenUser;
  }
  return Promise.resolve(null);
}

/**
 * Page-load context for getRedirectResult.
 * Android, and a normal iPhone Safari tab, sign in with a popup. An empty
 * result there is not "didn't finish" — including a leftover full-page
 * return whose account never left the Firebase host. A user in the result
 * is still Home. Backing out without an account is not the red line.
 */
export function redirectResultContext(env, details) {
  const source = env || {};
  const extra = details || {};
  const phonePopup = !prefersGoogleRedirect(source) && (
    isIOSDevice(source) || /Android/i.test(source.userAgent || "")
  );
  return {
    hadPendingRedirect: extra.hadPendingRedirect,
    navigationType: extra.navigationType || "",
    restoredFromCache: !!extra.restoredFromCache,
    popupReturn: !!extra.popupReturn || phonePopup,
  };
}

/** Firebase writes this before leaving, as JSON `"true"`, and clears it on return. */
export function firebasePendingRedirectKey(apiKey, appName) {
  return "firebase:pendingRedirect:" + apiKey + ":" + (appName || "[DEFAULT]");
}

export function hadPendingGoogleRedirect(storage, apiKey, appName) {
  try {
    if (!storage || !apiKey) return false;
    const raw = storage.getItem(firebasePendingRedirectKey(apiKey, appName));
    if (raw == null) return false;
    const value = JSON.parse(raw);
    return value === true || value === "true";
  } catch (err) {
    return false;
  }
}

/** Drop a leftover redirect flag so a phone popup reload is not treated as a failed return. */
export function clearPendingGoogleRedirect(storage, apiKey, appName) {
  try {
    if (storage && apiKey) storage.removeItem(firebasePendingRedirectKey(apiKey, appName));
  } catch (err) {
    // The popup can still hand the account back if storage is blocked.
  }
}

export function readPageNavigationType(performanceObj) {
  try {
    const perf = performanceObj || (typeof performance !== "undefined" ? performance : null);
    if (!perf || !perf.getEntriesByType) return "";
    const entries = perf.getEntriesByType("navigation");
    const nav = entries && entries[0];
    return (nav && nav.type) || "";
  } catch (err) {
    return "";
  }
}

/**
 * A leftover intent with no Firebase redirect in flight, a swipe-back
 * (back/forward or bfcache), is not a failed return from Google.
 */
export function isAbandonedGoogleRedirect(context) {
  if (!context) return false;
  // Android uses a popup. An empty getRedirectResult there is a failed handoff
  // or a leftover flag, not a redirect that should show "didn't finish".
  if (context.popupReturn) return true;
  if (context.restoredFromCache) return true;
  if (context.navigationType === "back_forward") return true;
  if (context.hadPendingRedirect === false) return true;
  return false;
}

export function browserSessionStorage() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch (err) {
    return null;
  }
}

function readIntent(storage) {
  try {
    if (!storage) return "";
    const value = storage.getItem(GOOGLE_REDIRECT_INTENT_KEY);
    return value === "signup" || value === "login" ? value : "";
  } catch (err) {
    return "";
  }
}

export function rememberGoogleRedirectIntent(storage, fromSignup) {
  try {
    if (!storage) return;
    storage.setItem(GOOGLE_REDIRECT_INTENT_KEY, fromSignup ? "signup" : "login");
  } catch (err) {
    // A blocked sessionStorage still lets redirect run; welcome copy may be generic.
  }
}

export function clearGoogleRedirectIntent(storage) {
  try {
    if (storage) storage.removeItem(GOOGLE_REDIRECT_INTENT_KEY);
  } catch (err) {
    // Ignore storage failures; the sign-in error is what the user needs to see.
  }
}

export function peekGoogleRedirectIntent(storage) {
  return readIntent(storage);
}

export function takeGoogleRedirectIntent(storage) {
  const value = readIntent(storage);
  clearGoogleRedirectIntent(storage);
  return value;
}

export function profileFromGoogleUser(user) {
  return {
    name: (user && user.displayName) || "",
    email: (user && user.email) || "",
    phone: "",
  };
}

export function googleRedirectOutcome(result, intent, context) {
  const user = result && result.user;
  if (user) {
    return {
      status: "success",
      fromSignup: intent === "signup",
      profile: profileFromGoogleUser(user),
    };
  }
  if (intent === "signup" || intent === "login") {
    if (isAbandonedGoogleRedirect(context)) {
      return { status: "abandoned", fromSignup: intent === "signup" };
    }
    return {
      status: "incomplete",
      fromSignup: intent === "signup",
      message: GOOGLE_REDIRECT_INCOMPLETE,
    };
  }
  return { status: "none" };
}

export function shouldFallbackToRedirect(error) {
  const code = error && error.code;
  if (
    code === "auth/popup-blocked" ||
    code === "auth/operation-not-supported-in-this-environment" ||
    code === "auth/network-request-failed" ||
    code === "auth/internal-error" ||
    code === "auth/cancelled-popup-request"
  ) {
    return true;
  }
  const message = error && error.message ? String(error.message) : "";
  return /network/i.test(message);
}

/**
 * Popup on desktop, Android, and a normal iPhone Safari tab. Full-page
 * redirect only for in-app browsers and the home-screen icon. A blocked
 * popup on a phone must not fall through to redirect: that return is what
 * shows "didn't finish".
 * Closing the popup, or COOP blocking `window.closed`, returns "cancelled"
 * with no error text. Pass `getPopup` from `beginGooglePopupGesture` so a
 * close is noticed even when Firebase’s own poll never settles.
 * `redirectAuth` uses the Firebase auth domain and may be the same instance as
 * `popupAuth`. Email and password stay on `popupAuth`.
 */
export async function startGoogleSignIn({
  popupAuth,
  redirectAuth,
  provider,
  fromSignup,
  useRedirect,
  allowRedirectFallback,
  storage,
  signInWithPopup,
  signInWithRedirect,
  getPopup,
  readClosed,
  intervalMs,
}) {
  if (useRedirect) {
    rememberGoogleRedirectIntent(storage, fromSignup);
    try {
      await signInWithRedirect(redirectAuth, provider);
      return { status: "redirecting" };
    } catch (error) {
      clearGoogleRedirectIntent(storage);
      return { status: "error", error };
    }
  }
  // A popup must not inherit a redirect flag. Otherwise a failed handoff
  // reloads onto "didn't finish" even though this attempt never left that way.
  clearGoogleRedirectIntent(storage);
  const raced = await finishPopupSignIn({
    signIn: () => signInWithPopup(popupAuth, provider),
    getPopup,
    readClosed,
    intervalMs,
  });
  if (raced.status === "success") return { status: "success", user: raced.user };
  if (raced.status === "cancelled") {
    return raced.whenUser
      ? { status: "cancelled", whenUser: raced.whenUser }
      : { status: "cancelled" };
  }
  const error = raced.error;
  if (allowRedirectFallback === false || !shouldFallbackToRedirect(error)) {
    if (quietPopupClose(error)) return { status: "cancelled" };
    return { status: "error", error };
  }
  rememberGoogleRedirectIntent(storage, fromSignup);
  try {
    await signInWithRedirect(redirectAuth, provider);
    return { status: "redirecting" };
  } catch (redirectError) {
    clearGoogleRedirectIntent(storage);
    return { status: "error", error: redirectError };
  }
}

let redirectResultPromise = null;

/** One shared call so React StrictMode cannot consume the redirect result twice. */
export function loadGoogleRedirectResult(redirectAuth, getRedirectResult) {
  if (!redirectResultPromise) {
    try {
      redirectResultPromise = Promise.resolve(getRedirectResult(redirectAuth));
    } catch (error) {
      redirectResultPromise = Promise.reject(error);
    }
  }
  return redirectResultPromise;
}

export function resetGoogleRedirectResultForTests() {
  redirectResultPromise = null;
}

/**
 * Redirect signs in on `redirectAuth`. The rest of Become reads `primaryAuth`.
 * When they differ, copy the Google credential onto the primary app.
 */
export async function adoptRedirectUser({
  primaryAuth,
  redirectAuth,
  result,
  credentialFromResult,
  signInWithCredential,
  signOut,
}) {
  const redirectedUser = result && result.user;
  if (!redirectedUser) return null;
  if (primaryAuth === redirectAuth) return redirectedUser;
  const credential = credentialFromResult(result);
  if (!credential) {
    const error = new Error("Google sign-in couldn't be finished. Please try again.");
    error.code = "auth/missing-google-credential";
    throw error;
  }
  const signedIn = await signInWithCredential(primaryAuth, credential);
  if (signOut) {
    signOut(redirectAuth).catch(() => {});
  }
  return (signedIn && signedIn.user) || redirectedUser;
}

/**
 * Top-level Firebase auth iframe. `parent` is this page's origin, which has
 * to be an authorized Firebase domain. The window name is not a data channel.
 * iPhone Safari partitions an embedded iframe, so this has to be its own window.
 */
export function googleAuthRelayUrl({ apiKey, appName, parentOrigin, sdkVersion }) {
  if (!apiKey || !parentOrigin) return "";
  const params = new URLSearchParams();
  params.set("apiKey", apiKey);
  params.set("appName", appName || "[DEFAULT]");
  params.set("v", sdkVersion || GOOGLE_AUTH_RELAY_SDK_VERSION);
  params.set("parent", parentOrigin);
  params.set("id", GOOGLE_AUTH_RELAY_FRAME_ID);
  return GOOGLE_AUTH_RELAY_ORIGIN + "/__/auth/iframe?" + params.toString();
}

/** Gadgets RPC messages from the helper start with `!_` and then JSON. */
export function parseRelayRpc(data) {
  if (typeof data !== "string" || data.slice(0, 2) !== "!_") return null;
  try {
    const msg = JSON.parse(data.slice(2));
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) return null;
    return msg;
  } catch (err) {
    return null;
  }
}

/**
 * The helper waits for this before it reads the account out of localStorage.
 * The result has to be a one-element array whose status is ACK. A bare object
 * leaves the helper on the empty "no account" event.
 */
export function relayAckMessage(msg) {
  if (!msg || msg.c == null) return "";
  return "!_" + JSON.stringify({
    s: "__cb",
    f: "..",
    // The helper checks this reply against the parent channel, which is "..".
    // Echoing the helper's own frame name never unblocks the stored account.
    r: "..",
    c: null,
    a: [msg.c, [{ status: "ACK" }]],
    g: false,
  });
}

export function authEventFromRelayRpc(msg) {
  if (!msg) return null;
  const service = typeof msg.s === "string" ? msg.s : "";
  if (service !== "authEvent" && !service.endsWith(":authEvent")) return null;
  const payload = Array.isArray(msg.a) ? msg.a[0] : null;
  const event = payload && payload.authEvent;
  if (!event || typeof event !== "object") return null;
  return event;
}

const QUIET_RELAY_ERROR_CODES = {
  "auth/no-auth-event": true,
  "auth/user-cancelled": true,
  "auth/web-storage-unsupported": true,
  "auth/popup-closed-by-user": true,
};

/**
 * A picked account, or a real helper error.
 * "No account yet" and a closed chooser are null so the login page stays quiet.
 */
export function accountFromRelayEvent(event) {
  if (!event || event.type === "unknown") return null;
  const code = event.error && event.error.code;
  if (code && QUIET_RELAY_ERROR_CODES[code]) return null;
  if (code) {
    const error = new Error(event.error.message || "Google sign-in couldn't be finished. Please try again.");
    error.code = code;
    return { error };
  }
  if (event.type !== "signInViaPopup" && event.type !== "signInViaRedirect") return null;
  if (!event.urlResponse || !event.sessionId) return null;
  return { event };
}

/**
 * One incoming message from the relay window.
 * Returns the ACK to post back, and the account when this message is the pick.
 * Messages from any other origin are ignored.
 */
export function relayReplyForMessage(event) {
  if (!event || event.origin !== GOOGLE_AUTH_RELAY_ORIGIN) return null;
  const msg = parseRelayRpc(event.data);
  if (!msg || msg.c == null) return null;
  return {
    ack: relayAckMessage(msg),
    targetOrigin: event.origin,
    account: accountFromRelayEvent(authEventFromRelayRpc(msg)),
  };
}

export function listenForGoogleRelay(win, onAccount) {
  if (!win || typeof win.addEventListener !== "function") return function() {};
  function onMessage(event) {
    const reply = relayReplyForMessage(event);
    if (!reply) return;
    try {
      if (reply.ack && event.source && typeof event.source.postMessage === "function") {
        event.source.postMessage(reply.ack, reply.targetOrigin);
      }
    } catch (err) {
      // The relay can close before the reply is delivered.
    }
    if (reply.account && onAccount) onAccount(reply.account);
  }
  win.addEventListener("message", onMessage);
  return function stop() {
    if (typeof win.removeEventListener === "function") {
      win.removeEventListener("message", onMessage);
    }
  };
}

/** Body for identitytoolkit accounts:signInWithIdp. The code stays inside requestUri. */
export function googleIdpSignInBody(event) {
  const body = {
    requestUri: event.urlResponse,
    sessionId: event.sessionId,
    returnSecureToken: true,
    returnIdpCredential: true,
  };
  if (event.postBody) body.postBody = event.postBody;
  if (event.tenantId) body.tenantId = event.tenantId;
  return body;
}

/**
 * Turn the account the relay delivered into the signed-in Firebase user.
 * The handler never puts that account in the return URL. This is the same
 * exchange Firebase runs after getRedirectResult, using the tokens the
 * identity toolkit returns when returnIdpCredential is set.
 */
export async function userFromGoogleRelayEvent({
  event,
  apiKey,
  auth,
  fetchImpl,
  signInWithCredential,
  credentialFromTokens,
}) {
  const fetchFn = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchFn || !apiKey || !event) {
    const error = new Error("Google sign-in couldn't be finished. Please try again.");
    error.code = "auth/missing-google-credential";
    throw error;
  }
  const response = await fetchFn(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(googleIdpSignInBody(event)),
    }
  );
  let body = {};
  try {
    body = await response.json();
  } catch (err) {
    body = {};
  }
  if (!response.ok || !body || body.error) {
    const message = (body && body.error && body.error.message)
      || "Google sign-in couldn't be finished. Please try again.";
    const error = new Error(message);
    error.code = "auth/internal-error";
    throw error;
  }
  const credential = credentialFromTokens(body.oauthIdToken || null, body.oauthAccessToken || null);
  if (!credential) {
    const error = new Error("Google sign-in couldn't be finished. Please try again.");
    error.code = "auth/missing-google-credential";
    throw error;
  }
  const signedIn = await signInWithCredential(auth, credential);
  return (signedIn && signedIn.user) || null;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Popup sign-in for a normal iPhone Safari tab, plus the relay window.
 * `waitForRelayUser` resolves with the Firebase user once the second window
 * has handed the picked account over. It stays pending when nobody picked.
 * Closing the chooser with no account is "cancelled" and has no red line.
 * This never starts a full-page redirect.
 */
export async function startIphoneGoogleSignIn({
  popupAuth,
  provider,
  storage,
  signInWithPopup,
  getPopup,
  readClosed,
  intervalMs,
  waitForRelayUser,
  graceMs,
}) {
  clearGoogleRedirectIntent(storage);
  const popupPromise = finishPopupSignIn({
    signIn: () => signInWithPopup(popupAuth, provider),
    getPopup,
    readClosed,
    intervalMs,
  }).then((raced) => {
    if (raced.status === "success") return { status: "success", user: raced.user };
    if (raced.status === "cancelled") {
      return { status: "cancelled", reason: raced.reason, whenUser: raced.whenUser };
    }
    if (quietPopupClose(raced.error)) return { status: "cancelled" };
    return { status: "error", error: raced.error };
  });
  const relayPromise = (typeof waitForRelayUser === "function" ? Promise.resolve().then(() => waitForRelayUser()) : new Promise(() => {}))
    .then((user) => (user ? { status: "success", user } : null))
    .catch((error) => ({ status: "error", error }));

  const first = await Promise.race([
    popupPromise.then((outcome) => ({ from: "popup", outcome })),
    relayPromise.then((outcome) => ({ from: "relay", outcome })),
  ]);

  if (first.from === "relay" && first.outcome && first.outcome.status === "success") {
    return first.outcome;
  }
  if (first.from === "popup" && first.outcome.status === "success") {
    return first.outcome;
  }
  if (first.from === "relay" && first.outcome && first.outcome.status === "error") {
    return first.outcome;
  }

  const popupOutcome = first.from === "popup" ? first.outcome : await popupPromise;
  // Safari hides window.closed while the account picker is open. The button
  // can come back, and Home still opens when the relay delivers the account.
  if (popupOutcome.status === "cancelled" && popupOutcome.reason === "unavailable") {
    return {
      status: "cancelled",
      whenUser: relayPromise.then(
        (outcome) => (outcome && outcome.status === "success" ? outcome.user || null : null),
        () => null
      ),
    };
  }
  if (popupOutcome.status === "error") return popupOutcome;

  const late = await Promise.race([
    relayPromise,
    delay(typeof graceMs === "number" ? graceMs : 2500).then(() => null),
  ]);
  if (late && late.status === "success" && late.user) return late;
  if (late && late.status === "error") return late;
  if (popupOutcome.status === "success") return popupOutcome;
  if (popupOutcome.status === "cancelled") {
    return { status: "cancelled" };
  }
  return popupOutcome;
}
