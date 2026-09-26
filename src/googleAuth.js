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
 * Full-page redirect only where a popup cannot report back.
 *
 * iPhone Safari and Chrome used to redirect. Google does finish, but the
 * credential is left in sessionStorage on become-app-dde78.firebaseapp.com.
 * The Vercel page can only read that through a third-party frame, which iOS
 * partitions, so getRedirectResult comes back empty and the login screen says
 * sign-in didn't finish. A popup hands the credential to this page directly.
 * authDomain stays on the Firebase host: the Vercel /__/auth/handler address
 * is not an authorized Google redirect URI.
 */
export function prefersGoogleRedirect(env) {
  const source = env || {};
  const userAgent = source.userAgent || "";
  if (isInAppBrowser(userAgent)) return true;
  if (isStandaloneApp(source)) return true;
  return false;
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

/**
 * Open a same-origin window during the tap. When Firebase later asks for a
 * popup, hand it the handler address and let that window navigate itself.
 *
 * Setting location from here on an about:blank window drops window.opener on
 * iPhone. The Google handler then cannot see this page, stores the credential
 * where Become cannot read it, and the login screen comes back signed out.
 * Returns a function that closes the window if Firebase never used it.
 */
export function beginGooglePopupGesture(win, prime) {
  if (!prime || !win || typeof win.open !== "function") return function() {};
  const origin = win.location && win.location.origin ? win.location.origin : "";
  const startUrl = origin ? origin + GOOGLE_AUTH_START_PATH : "about:blank";
  let opened = null;
  try {
    opened = win.open(startUrl, "become-google-auth");
  } catch (err) {
    opened = null;
  }
  if (!opened) return function() {};
  const original = win.open.bind(win);
  let settled = false;
  function restore() {
    if (win.open === wrapped) win.open = original;
  }
  function wrapped(url, target, windowFeatures) {
    restore();
    settled = true;
    const handler = isFirebaseAuthHandlerUrl(url) ? url : "";
    let handedOff = false;
    if (handler && origin) {
      try {
        if (opened.sessionStorage) opened.sessionStorage.setItem(GOOGLE_POPUP_URL_KEY, handler);
        handedOff = true;
      } catch (err) { /* The start page can still take a message. */ }
      try {
        opened.postMessage({ type: GOOGLE_POPUP_NAV_MESSAGE, url: handler }, origin);
        handedOff = true;
      } catch (err) { /* Fall through if the window will not take a message. */ }
    }
    if (!handedOff) {
      try {
        if (url) opened.location.href = url;
      } catch (err) {
        return original(url, target, windowFeatures);
      }
    }
    try { if (target && target !== "_blank") opened.name = target; } catch (err) { /* name is optional */ }
    try { opened.focus(); } catch (err) { /* The window is already open. */ }
    return opened;
  }
  win.open = wrapped;
  return function release() {
    restore();
    if (!settled) {
      try { opened.close(); } catch (err) { /* already closed */ }
    }
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
  try {
    const result = await signInWithPopup(popupAuth, provider);
    return { status: "success", user: result && result.user };
  } catch (error) {
    if (allowRedirectFallback === false || !shouldFallbackToRedirect(error)) {
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
