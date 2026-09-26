/** Google sign-in helpers. Desktop and phone browsers use a popup. In-app browsers redirect. */

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
 * Home-screen Safari reports `navigator.standalone`. Desktop in-app and desktop
 * home-screen apps still use a full-page redirect. A phone does not: that
 * return is what shows "didn't finish".
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
 * Full-page redirect only where a popup cannot report back and the return can
 * still be read.
 *
 * iPhone and Android used to redirect, including from the home-screen icon and
 * from in-app browsers. Google does finish, but the credential is left in
 * sessionStorage on become-app-dde78.firebaseapp.com. The Vercel page can only
 * read that through a third-party frame, which the phone partitions, so
 * getRedirectResult comes back empty and the login screen says sign-in didn't
 * finish. A popup that starts on this site can hand the credential back.
 * authDomain stays on the Firebase host: the Vercel /__/auth/handler address
 * is not an authorized Google redirect URI.
 */
export function prefersGoogleRedirect(env) {
  const source = env || {};
  const userAgent = source.userAgent || "";
  if (isIOSDevice(source) || /Android/i.test(userAgent)) return false;
  if (isInAppBrowser(userAgent)) return true;
  if (isStandaloneApp(source)) return true;
  return false;
}

/** Hash the start page reads when it is opened without a window handle. */
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

/** Same-origin page the phone popup loads first, then leaves for the Firebase handler. */
export const GOOGLE_AUTH_START_PATH = "/google-auth-start.html";

export const GOOGLE_POPUP_URL_KEY = "become.googleHandlerUrl";

export const GOOGLE_POPUP_NAV_MESSAGE = "become-google-nav";

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

/**
 * Home-screen Safari tells Firebase `navigator.standalone`, and Firebase then
 * opens Google by clicking a link instead of `window.open`. That link starts
 * on the Firebase host, so iPhone drops `window.opener` and the account never
 * gets back to Become. Hide the flag so Firebase calls `window.open`, which
 * this page already wrapped.
 */
function hideStandaloneFlag(win) {
  const nav = win && win.navigator;
  if (!nav || nav.standalone !== true) return function() {};
  let restore = function() {};
  try {
    const own = Object.getOwnPropertyDescriptor(nav, "standalone");
    Object.defineProperty(nav, "standalone", {
      configurable: true,
      get: function() { return false; },
    });
    restore = function() {
      try {
        if (own) Object.defineProperty(nav, "standalone", own);
        else delete nav.standalone;
      } catch (err) { /* The sign-in page can keep going. */ }
    };
  } catch (err) {
    return function() {};
  }
  return restore;
}

function publishHandlerUrl(popup, origin, handler) {
  if (!popup || !handler || !origin) return false;
  let handed = false;
  try {
    if (popup.sessionStorage) popup.sessionStorage.setItem(GOOGLE_POPUP_URL_KEY, handler);
    handed = true;
  } catch (err) { /* The start page can still take a message. */ }
  try {
    popup.postMessage({ type: GOOGLE_POPUP_NAV_MESSAGE, url: handler }, origin);
    handed = true;
  } catch (err) { /* Fall through if the window will not take a message. */ }
  try {
    if (popup.localStorage) popup.localStorage.setItem(GOOGLE_POPUP_URL_KEY, handler);
  } catch (err) { /* Same-origin storage is only a backup. */ }
  return handed;
}

/**
 * Firebase on a home-screen app creates an `<a>` and clicks it. Point that
 * click at the already-open start page, or open the start page with the
 * handler address in the hash when there is no window handle.
 */
function watchFirebaseAnchor(win, origin, getPopup, markUsed) {
  const doc = win && win.document;
  if (!doc || typeof doc.createElement !== "function") return function() {};
  const original = doc.createElement.bind(doc);
  doc.createElement = function(tagName) {
    const el = original(tagName);
    if (!el || String(tagName).toLowerCase() !== "a" || typeof el.dispatchEvent !== "function") return el;
    const origDispatch = el.dispatchEvent.bind(el);
    el.dispatchEvent = function(event) {
      let href = "";
      try { href = el.href || ""; } catch (err) { href = ""; }
      if (!event || event.type !== "click" || !isFirebaseAuthHandlerUrl(href)) {
        return origDispatch(event);
      }
      const popup = getPopup();
      if (popup && publishHandlerUrl(popup, origin, href)) {
        markUsed();
        try { if (el.target && el.target !== "_blank") popup.name = el.target; } catch (err) { /* name is optional */ }
        try { popup.focus(); } catch (err) { /* The window is already open. */ }
        return true;
      }
      const hashed = startPageHashUrl(origin, href);
      if (hashed) {
        try { el.href = hashed; } catch (err) { /* Keep Firebase's address. */ }
      }
      markUsed();
      return origDispatch(event);
    };
    return el;
  };
  return function restoreCreate() {
    doc.createElement = original;
  };
}

/**
 * Open a same-origin window during the tap. When Firebase later asks for a
 * popup, hand it the handler address and let that window navigate itself.
 *
 * Setting location from here on an about:blank window drops window.opener on
 * iPhone. The Google handler then cannot see this page, stores the credential
 * where Become cannot read it, and the login screen comes back signed out.
 * The home-screen app used to leave for Google in this same window. That
 * return is the red "didn't finish" line, because the phone cannot read the
 * credential back.
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
    if (!opened && origin && win.document && typeof win.document.createElement === "function") {
      try {
        const starter = win.document.createElement("a");
        starter.href = startUrl;
        starter.target = "become-google-auth";
        if (typeof starter.click === "function") starter.click();
      } catch (err) { /* Firebase's own open is still wrapped below. */ }
    }
  }
  const original = win.open;
  let settled = false;
  const restoreStandalone = prime ? hideStandaloneFlag(win) : function() {};
  const restoreCreate = prime ? watchFirebaseAnchor(win, origin, function() { return opened; }, function() { settled = true; }) : function() {};
  function restore() {
    if (win.open === wrapped) win.open = original;
  }
  function wrapped(url, target, windowFeatures) {
    restore();
    settled = true;
    const handler = isFirebaseAuthHandlerUrl(url) ? url : "";
    if (prime && opened) {
      const handedOff = handler ? publishHandlerUrl(opened, origin, handler) : false;
      if (!handedOff) {
        try {
          if (url) opened.location.href = url;
        } catch (err) {
          try {
            opened = original.call(win, url, target, windowFeatures);
          } catch (err2) {
            opened = null;
          }
          return opened;
        }
      }
      try { if (target && target !== "_blank") opened.name = target; } catch (err) { /* name is optional */ }
      try { opened.focus(); } catch (err) { /* The window is already open. */ }
      return opened;
    }
    if (prime && handler && origin) {
      const hashed = startPageHashUrl(origin, handler);
      try {
        opened = original.call(win, hashed || url, target, windowFeatures);
      } catch (err) {
        opened = null;
      }
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
    restoreCreate();
    restoreStandalone();
    if (prime && opened && !settled) {
      try { opened.close(); } catch (err) { /* already closed */ }
    }
  }
  release.popup = function() { return opened; };
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
  let settled = false;
  const signInPromise = Promise.resolve().then(() => signIn()).then(
    (result) => {
      settled = true;
      return { kind: "success", user: result && result.user };
    },
    (error) => {
      settled = true;
      return { kind: "error", error };
    }
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
    if (!settled) signInPromise.then(() => {}, () => {});
    return { status: "cancelled", reason: winner.state };
  }
  return { status: "rejected", error: winner.error };
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
 * Popup on desktop and on iPhone/Android browsers. Redirect only where a popup
 * cannot report back. A blocked popup on a phone must not fall through to
 * redirect: that return is what shows "didn't finish".
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
  const raced = await finishPopupSignIn({
    signIn: () => signInWithPopup(popupAuth, provider),
    getPopup,
    readClosed,
    intervalMs,
  });
  if (raced.status === "success") return { status: "success", user: raced.user };
  if (raced.status === "cancelled") return { status: "cancelled" };
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
