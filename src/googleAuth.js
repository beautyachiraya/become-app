/** Google sign-in helpers. Desktop keeps a popup; phones use a full-page redirect. */

export const FIREBASE_AUTH_DOMAIN = "become-app-dde78.firebaseapp.com";

/** Live site. Same-origin auth handler is proxied here (see vercel.json). */
export const PRODUCTION_APP_HOST = "become-app-rho.vercel.app";

export const GOOGLE_REDIRECT_INTENT_KEY = "become.googleRedirectIntent";

export const GOOGLE_REDIRECT_INCOMPLETE =
  "Google sign-in didn't finish. Please try again.";

/**
 * On the live host, Google redirect must use that host as authDomain so the
 * handler iframe is same-origin. Safari and Chrome block the default
 * firebaseapp.com helper. Other hosts stay on the Firebase domain so local
 * popup sign-in and preview URLs keep working.
 */
export function resolveAuthDomain(hostname) {
  if (hostname === PRODUCTION_APP_HOST) return PRODUCTION_APP_HOST;
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

function narrowViewportPrefersRedirect(env) {
  if (env && env.narrowViewport === true) return true;
  if (env && env.narrowViewport === false) return false;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return !!window.matchMedia("(max-width: 768px)").matches;
  } catch (err) {
    return false;
  }
}

/** Popups fail on phones, in-app browsers, and phone-width windows. */
export function prefersGoogleRedirect(env) {
  const source = env || {};
  if (narrowViewportPrefersRedirect(source)) return true;
  const userAgent = source.userAgent || "";
  const platform = source.platform || "";
  const maxTouchPoints = source.maxTouchPoints || 0;
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = /Mobi|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|TikTok|LinkedInApp|MicroMessenger|GSA\//i.test(userAgent);
  return isIOS || isAndroid || isMobile || isInAppBrowser;
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

export function googleRedirectOutcome(result, intent) {
  const user = result && result.user;
  if (user) {
    return {
      status: "success",
      fromSignup: intent === "signup",
      profile: profileFromGoogleUser(user),
    };
  }
  if (intent === "signup" || intent === "login") {
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
 * Popup on desktop. Redirect on mobile, and when the browser blocks the popup.
 * `redirectAuth` may be a second Firebase Auth instance whose authDomain is the
 * live site; `popupAuth` stays on the default app so email/password is untouched.
 */
export async function startGoogleSignIn({
  popupAuth,
  redirectAuth,
  provider,
  fromSignup,
  useRedirect,
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
    if (!shouldFallbackToRedirect(error)) return { status: "error", error };
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
