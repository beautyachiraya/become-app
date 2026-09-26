import {
  FIREBASE_AUTH_DOMAIN,
  PRODUCTION_APP_HOST,
  GOOGLE_REDIRECT_INTENT_KEY,
  GOOGLE_REDIRECT_INCOMPLETE,
  resolveAuthDomain,
  prefersGoogleRedirect,
  shouldPrimeGooglePopup,
  redirectFallbackAllowed,
  GOOGLE_AUTH_START_PATH,
  GOOGLE_POPUP_URL_KEY,
  GOOGLE_POPUP_NAV_MESSAGE,
  isFirebaseAuthHandlerUrl,
  handlerUrlFromStartHash,
  startPageHashUrl,
  handlerUrlFromPopupMessage,
  takeStoredHandlerUrl,
  beginGooglePopupGesture,
  readPopupClosed,
  watchPopupDismissal,
  finishPopupSignIn,
  hadPendingGoogleRedirect,
  clearPendingGoogleRedirect,
  firebasePendingRedirectKey,
  readPageNavigationType,
  isAbandonedGoogleRedirect,
  rememberGoogleRedirectIntent,
  peekGoogleRedirectIntent,
  takeGoogleRedirectIntent,
  profileFromGoogleUser,
  googleRedirectOutcome,
  shouldFallbackToRedirect,
  startGoogleSignIn,
  loadGoogleRedirectResult,
  resetGoogleRedirectResultForTests,
  adoptRedirectUser,
} from "./googleAuth";

function memoryStorage(initial) {
  const data = { ...(initial || {}) };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    data,
  };
}

describe("resolveAuthDomain", () => {
  it("uses the Firebase auth domain on every host, including the live site", () => {
    expect(resolveAuthDomain(PRODUCTION_APP_HOST)).toBe(FIREBASE_AUTH_DOMAIN);
    expect(resolveAuthDomain("localhost")).toBe(FIREBASE_AUTH_DOMAIN);
    expect(resolveAuthDomain("become-app-git-preview.vercel.app")).toBe(FIREBASE_AUTH_DOMAIN);
    expect(resolveAuthDomain("")).toBe(FIREBASE_AUTH_DOMAIN);
  });
});

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

describe("prefersGoogleRedirect", () => {
  it("uses a popup on iPhone Safari, Android Chrome, and a narrow desktop window", () => {
    expect(prefersGoogleRedirect({ userAgent: IPHONE_SAFARI })).toBe(false);
    expect(prefersGoogleRedirect({ userAgent: ANDROID_CHROME })).toBe(false);
    expect(prefersGoogleRedirect({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
      narrowViewport: true,
    })).toBe(false);
    expect(prefersGoogleRedirect({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    })).toBe(false);
  });

  it("keeps a popup on a wide desktop browser", () => {
    const desktop = {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
      narrowViewport: false,
    };
    expect(prefersGoogleRedirect(desktop)).toBe(false);
    expect(prefersGoogleRedirect({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      narrowViewport: false,
    })).toBe(false);
  });

  it("still redirects from in-app browsers and an installed home-screen app", () => {
    expect(prefersGoogleRedirect({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.0.0",
    })).toBe(true);
    expect(prefersGoogleRedirect({
      userAgent: IPHONE_SAFARI,
      standalone: true,
    })).toBe(true);
    expect(prefersGoogleRedirect({
      userAgent: IPHONE_SAFARI,
      standalone: false,
    })).toBe(false);
  });
});

describe("shouldPrimeGooglePopup", () => {
  it("opens the window during the tap on phones that use a popup", () => {
    expect(shouldPrimeGooglePopup({ userAgent: IPHONE_SAFARI })).toBe(true);
    expect(shouldPrimeGooglePopup({ userAgent: ANDROID_CHROME })).toBe(true);
    expect(shouldPrimeGooglePopup({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
    })).toBe(false);
    expect(shouldPrimeGooglePopup({ userAgent: IPHONE_SAFARI, standalone: true })).toBe(false);
  });
});

describe("redirectFallbackAllowed", () => {
  it("does not start a redirect after a failed popup on iPhone or Android", () => {
    expect(redirectFallbackAllowed({ userAgent: IPHONE_SAFARI })).toBe(false);
    expect(redirectFallbackAllowed({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    })).toBe(false);
    expect(redirectFallbackAllowed({ userAgent: ANDROID_CHROME })).toBe(false);
    expect(redirectFallbackAllowed({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
    })).toBe(true);
  });
});

describe("isFirebaseAuthHandlerUrl", () => {
  const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";

  it("accepts only the Firebase handler", () => {
    expect(isFirebaseAuthHandlerUrl(handler)).toBe(true);
    expect(isFirebaseAuthHandlerUrl("https://become-app-dde78.firebaseapp.com/__/auth/handler")).toBe(true);
    expect(isFirebaseAuthHandlerUrl("https://become-app-dde78.firebaseapp.com/__/auth/handler.evil")).toBe(false);
    expect(isFirebaseAuthHandlerUrl("https://become-app-rho.vercel.app/__/auth/handler")).toBe(false);
    expect(isFirebaseAuthHandlerUrl("https://evil.example/__/auth/handler")).toBe(false);
    expect(isFirebaseAuthHandlerUrl("")).toBe(false);
  });

  it("reads a handler address from the start page message or its storage", () => {
    const origin = "https://become-app-rho.vercel.app";
    expect(handlerUrlFromPopupMessage({
      origin,
      data: { type: GOOGLE_POPUP_NAV_MESSAGE, url: handler },
    }, origin)).toBe(handler);
    expect(handlerUrlFromPopupMessage({
      origin: "https://evil.example",
      data: { type: GOOGLE_POPUP_NAV_MESSAGE, url: handler },
    }, origin)).toBe("");
    expect(handlerUrlFromPopupMessage({
      origin,
      data: { type: GOOGLE_POPUP_NAV_MESSAGE, url: "https://evil.example/" },
    }, origin)).toBe("");

    const storage = memoryStorage();
    storage.setItem(GOOGLE_POPUP_URL_KEY, handler);
    expect(takeStoredHandlerUrl(storage)).toBe(handler);
    expect(takeStoredHandlerUrl(storage)).toBe("");
    storage.setItem(GOOGLE_POPUP_URL_KEY, "https://evil.example/");
    expect(takeStoredHandlerUrl(storage)).toBe("");
  });

  it("reads the handler from the start-page hash and ignores anything else", () => {
    const origin = "https://become-app-rho.vercel.app";
    const hashed = startPageHashUrl(origin, handler);
    expect(hashed.startsWith(origin + GOOGLE_AUTH_START_PATH + "#")).toBe(true);
    expect(isFirebaseAuthHandlerUrl(hashed)).toBe(false);
    expect(handlerUrlFromStartHash("#" + hashed.split("#")[1])).toBe(handler);
    expect(handlerUrlFromStartHash(handler)).toBe(handler);
    expect(handlerUrlFromStartHash("#https%3A%2F%2Fevil.example%2F")).toBe("");
    expect(handlerUrlFromStartHash("")).toBe("");
    expect(startPageHashUrl(origin, "https://become-app-rho.vercel.app/__/auth/handler")).toBe("");
  });

  it("keeps the phone start page on the same handler check", () => {
    const fs = require("fs");
    const path = require("path");
    const html = fs.readFileSync(path.join(__dirname, "../public/google-auth-start.html"), "utf8");
    expect(html).toContain(GOOGLE_POPUP_URL_KEY);
    expect(html).toContain(GOOGLE_POPUP_NAV_MESSAGE);
    expect(html).toContain("https://" + FIREBASE_AUTH_DOMAIN);
    expect(html).toContain('"/__/auth/handler"');
    expect(html).toContain("location.replace(url)");
    expect(html).toContain("readHash");
  });

  it("has the start page navigate itself to the Firebase handler", () => {
    const fs = require("fs");
    const path = require("path");
    const vm = require("vm");
    const html = fs.readFileSync(path.join(__dirname, "../public/google-auth-start.html"), "utf8");
    const match = html.match(/<script>([\s\S]*)<\/script>/);
    expect(match).toBeTruthy();
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";

    function runStartPage(setup) {
      const location = {
        origin: "https://become-app-rho.vercel.app",
        hash: setup.hash || "",
        replace: jest.fn(),
      };
      const sessionData = { ...(setup.session || {}) };
      const localData = { ...(setup.local || {}) };
      const timers = [];
      const sandbox = {
        location,
        sessionStorage: {
          getItem(key) { return Object.prototype.hasOwnProperty.call(sessionData, key) ? sessionData[key] : null; },
          removeItem(key) { delete sessionData[key]; },
        },
        localStorage: {
          getItem(key) { return Object.prototype.hasOwnProperty.call(localData, key) ? localData[key] : null; },
          removeItem(key) { delete localData[key]; },
        },
        window: {},
        setInterval(fn) { timers.push(fn); return timers.length; },
        setTimeout: () => 2,
        clearInterval() {},
        URL,
        decodeURIComponent,
      };
      sandbox.timers = timers;
      sandbox.window = sandbox;
      sandbox.window.addEventListener = jest.fn();
      vm.createContext(sandbox);
      vm.runInContext(match[1], sandbox);
      return { location, sessionData, localData, sandbox };
    }

    const fromHash = runStartPage({
      hash: "#" + encodeURIComponent(handler),
    });
    expect(fromHash.location.replace).toHaveBeenCalledTimes(1);
    expect(fromHash.location.replace).toHaveBeenCalledWith(handler);

    const fromStorage = runStartPage({
      session: { [GOOGLE_POPUP_URL_KEY]: handler },
    });
    expect(fromStorage.location.replace).toHaveBeenCalledWith(handler);
    expect(fromStorage.sessionData[GOOGLE_POPUP_URL_KEY]).toBeUndefined();

    const ignored = runStartPage({
      hash: "#" + encodeURIComponent("https://evil.example/__/auth/handler"),
    });
    expect(ignored.location.replace).not.toHaveBeenCalled();

    const later = runStartPage({});
    expect(later.location.replace).not.toHaveBeenCalled();
    expect(later.sandbox.timers.length).toBe(1);
    later.location.hash = "#" + encodeURIComponent(handler);
    later.sandbox.timers[0]();
    expect(later.location.replace).toHaveBeenCalledWith(handler);
  });
});

describe("beginGooglePopupGesture", () => {
  function popupWindow() {
    const data = {};
    return {
      closed: false,
      name: "",
      location: { href: "about:blank" },
      sessionStorage: {
        setItem(key, value) { data[key] = String(value); },
        getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
        removeItem(key) { delete data[key]; },
      },
      postMessage: jest.fn(),
      focus: jest.fn(),
      close: jest.fn(),
      data,
    };
  }

  it("lets the phone window open the handler itself so the opener stays attached", () => {
    const popup = popupWindow();
    const nativeOpen = jest.fn(() => popup);
    const origin = "https://become-app-rho.vercel.app";
    const win = {
      location: { origin },
      open: nativeOpen,
    };
    const release = beginGooglePopupGesture(win, true);
    expect(nativeOpen).toHaveBeenCalledWith(
      origin + GOOGLE_AUTH_START_PATH,
      "become-google-auth"
    );
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    const assigned = [];
    popup.location = {
      _href: "about:blank",
      get href() { return this._href; },
      set href(value) {
        assigned.push(value);
        this._href = value;
      },
    };
    const handed = win.open(handler, "event", "width=500");
    expect(handed).toBe(popup);
    const hashed = startPageHashUrl(origin, handler);
    expect(popup.location.href).toBe(hashed);
    expect(assigned).toEqual([hashed]);
    expect(assigned.some((value) => isFirebaseAuthHandlerUrl(value))).toBe(false);
    expect(handlerUrlFromStartHash("#" + popup.location.href.split("#")[1])).toBe(handler);
    expect(popup.location.href.startsWith(origin + GOOGLE_AUTH_START_PATH)).toBe(true);
    expect(popup.postMessage).not.toHaveBeenCalled();
    expect(popup.focus).toHaveBeenCalled();
    win.open("https://other.example/", "_blank");
    expect(nativeOpen).toHaveBeenLastCalledWith("https://other.example/", "_blank");
    release();
    expect(popup.close).not.toHaveBeenCalled();
  });

  it("replaces the popup with the start-page hash and does not assign the handler if that throws", () => {
    const origin = "https://become-app-rho.vercel.app";
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    const hashed = startPageHashUrl(origin, handler);

    const replaced = popupWindow();
    replaced.location.replace = jest.fn();
    const win = {
      location: { origin },
      open: jest.fn(() => replaced),
    };
    beginGooglePopupGesture(win, true);
    expect(win.open(handler, "firebase", "width=500")).toBe(replaced);
    expect(replaced.location.replace).toHaveBeenCalledWith(hashed);
    expect(replaced.location.href).toBe("about:blank");
    expect(isFirebaseAuthHandlerUrl(replaced.location.href)).toBe(false);

    const fallback = popupWindow();
    const assigned = [];
    fallback.location = {
      _href: "about:blank",
      replace() { throw new Error("replace blocked"); },
      get href() { return this._href; },
      set href(value) {
        assigned.push(value);
        this._href = value;
      },
    };
    const winFallback = {
      location: { origin },
      open: jest.fn(() => fallback),
    };
    beginGooglePopupGesture(winFallback, true);
    expect(winFallback.open(handler, "firebase")).toBe(fallback);
    expect(fallback.location.href).toBe(hashed);
    expect(assigned).toEqual([hashed]);
    expect(assigned.some((value) => value === handler)).toBe(false);
  });

  it("hands the handler through storage and a message when the popup location cannot change", () => {
    const origin = "https://become-app-rho.vercel.app";
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    const popup = popupWindow();
    const local = {};
    popup.localStorage = {
      setItem(key, value) { local[key] = String(value); },
      getItem(key) { return Object.prototype.hasOwnProperty.call(local, key) ? local[key] : null; },
    };
    popup.location = {
      _href: "about:blank",
      replace() { throw new Error("replace blocked"); },
      get href() { return this._href; },
      set href(_value) { throw new Error("href blocked"); },
    };
    const win = {
      location: { origin },
      open: jest.fn(() => popup),
    };
    beginGooglePopupGesture(win, true);
    expect(win.open(handler, "firebase")).toBe(popup);
    expect(popup.location.href).toBe("about:blank");
    expect(popup.data[GOOGLE_POPUP_URL_KEY]).toBe(handler);
    expect(local[GOOGLE_POPUP_URL_KEY]).toBe(handler);
    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: GOOGLE_POPUP_NAV_MESSAGE, url: handler },
      origin
    );
  });

  it("closes an unused window and does nothing when a popup is not needed", () => {
    const popup = popupWindow();
    const win = {
      location: { origin: "https://become-app-rho.vercel.app" },
      open: jest.fn(() => popup),
    };
    beginGooglePopupGesture(win, true)();
    expect(popup.close).toHaveBeenCalled();

    const quiet = { open: jest.fn() };
    expect(() => beginGooglePopupGesture(quiet, false)()).not.toThrow();
    expect(quiet.open).not.toHaveBeenCalled();
    expect(beginGooglePopupGesture(null, true)()).toBeUndefined();
    expect(beginGooglePopupGesture(null, true).popup()).toBeNull();
  });

  it("remembers the desktop popup Firebase opens without a primed window", () => {
    const popup = popupWindow();
    const nativeOpen = jest.fn(() => popup);
    const win = {
      location: { origin: "https://become-app-rho.vercel.app" },
      open: nativeOpen,
    };
    const release = beginGooglePopupGesture(win, false);
    expect(nativeOpen).not.toHaveBeenCalled();
    expect(release.popup()).toBeNull();
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    expect(win.open(handler, "firebase", "width=500")).toBe(popup);
    expect(nativeOpen).toHaveBeenCalledWith(handler, "firebase", "width=500");
    expect(release.popup()).toBe(popup);
    expect(popup.location.href).toBe("about:blank");
    release();
    expect(popup.close).not.toHaveBeenCalled();
    expect(win.open).toBe(nativeOpen);
  });
});

describe("popup close detection", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("reads closed, open, and a COOP throw that hides window.closed", () => {
    expect(readPopupClosed(null)).toBe("closed");
    expect(readPopupClosed({ closed: false })).toBe("open");
    expect(readPopupClosed({ closed: true })).toBe("closed");
    expect(readPopupClosed({
      get closed() {
        throw new Error("Cross-Origin-Opener-Policy policy would block the window.closed call.");
      },
    })).toBe("unavailable");
  });

  it("waits while the chooser is open, then resolves when it closes", async () => {
    jest.useFakeTimers();
    let popup = null;
    const watch = watchPopupDismissal(() => popup, { intervalMs: 20 });
    let state = "";
    watch.promise.then((value) => { state = value; });
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(state).toBe("");
    popup = { closed: false };
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(state).toBe("");
    popup = { closed: true };
    jest.advanceTimersByTime(20);
    await expect(watch.promise).resolves.toBe("closed");
  });

  it("stops waiting when sign-in finishes first", async () => {
    jest.useFakeTimers();
    const watch = watchPopupDismissal(() => ({ closed: false }), { intervalMs: 20 });
    let state = "";
    watch.promise.then((value) => { state = value; });
    watch.stop();
    jest.advanceTimersByTime(200);
    await Promise.resolve();
    expect(state).toBe("");
  });

  it("cancels when the popup is already closed and sign-in never settles", async () => {
    const outcome = await finishPopupSignIn({
      signIn: () => new Promise(() => {}),
      getPopup: () => ({ closed: true }),
      intervalMs: 1000,
    });
    expect(outcome).toEqual({ status: "cancelled", reason: "closed" });
  });

  it("cancels when COOP makes window.closed unreadable", async () => {
    const outcome = await finishPopupSignIn({
      signIn: () => new Promise(() => {}),
      getPopup: () => ({
        get closed() {
          throw new Error("Cross-Origin-Opener-Policy policy would block the window.closed call.");
        },
      }),
      intervalMs: 1000,
    });
    expect(outcome).toEqual({ status: "cancelled", reason: "unavailable" });
  });

  it("returns the user when the popup stays open", async () => {
    const user = { displayName: "A", email: "a@b.com" };
    const outcome = await finishPopupSignIn({
      signIn: () => Promise.resolve({ user }),
      getPopup: () => ({ closed: false }),
      intervalMs: 1000,
    });
    expect(outcome).toEqual({ status: "success", user });
  });
});

describe("google redirect intent", () => {
  it("remembers signup vs sign-in across the redirect", () => {
    const storage = memoryStorage();
    rememberGoogleRedirectIntent(storage, true);
    expect(peekGoogleRedirectIntent(storage)).toBe("signup");
    expect(storage.data[GOOGLE_REDIRECT_INTENT_KEY]).toBe("signup");
    expect(takeGoogleRedirectIntent(storage)).toBe("signup");
    expect(peekGoogleRedirectIntent(storage)).toBe("");

    rememberGoogleRedirectIntent(storage, false);
    expect(takeGoogleRedirectIntent(storage)).toBe("login");
  });

  it("ignores storage that throws", () => {
    const storage = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
    };
    expect(() => rememberGoogleRedirectIntent(storage, true)).not.toThrow();
    expect(peekGoogleRedirectIntent(storage)).toBe("");
    expect(takeGoogleRedirectIntent(null)).toBe("");
  });
});

describe("googleRedirectOutcome", () => {
  const user = { displayName: "Achiraya", email: "a@example.com" };

  it("matches the popup profile bootstrap", () => {
    expect(profileFromGoogleUser(user)).toEqual({
      name: "Achiraya",
      email: "a@example.com",
      phone: "",
    });
    expect(googleRedirectOutcome({ user }, "signup")).toEqual({
      status: "success",
      fromSignup: true,
      profile: { name: "Achiraya", email: "a@example.com", phone: "" },
    });
    expect(googleRedirectOutcome({ user }, "login").fromSignup).toBe(false);
  });

  it("explains a redirect that returned without a user", () => {
    expect(googleRedirectOutcome(null, "login", {
      hadPendingRedirect: true,
      navigationType: "navigate",
    })).toEqual({
      status: "incomplete",
      fromSignup: false,
      message: GOOGLE_REDIRECT_INCOMPLETE,
    });
    expect(googleRedirectOutcome(null, "login")).toEqual({
      status: "incomplete",
      fromSignup: false,
      message: GOOGLE_REDIRECT_INCOMPLETE,
    });
    expect(googleRedirectOutcome(null, "")).toEqual({ status: "none" });
  });

  it("does not treat a swipe-back or a leftover intent as a failed Google return", () => {
    expect(isAbandonedGoogleRedirect({
      hadPendingRedirect: true,
      navigationType: "back_forward",
    })).toBe(true);
    expect(isAbandonedGoogleRedirect({ restoredFromCache: true, hadPendingRedirect: true })).toBe(true);
    expect(isAbandonedGoogleRedirect({ hadPendingRedirect: false, navigationType: "navigate" })).toBe(true);
    expect(isAbandonedGoogleRedirect({ hadPendingRedirect: true, navigationType: "navigate" })).toBe(false);
    expect(isAbandonedGoogleRedirect()).toBe(false);

    expect(googleRedirectOutcome(null, "login", {
      hadPendingRedirect: false,
      navigationType: "navigate",
    })).toEqual({ status: "abandoned", fromSignup: false });
    expect(googleRedirectOutcome(null, "signup", {
      hadPendingRedirect: true,
      navigationType: "back_forward",
    })).toEqual({ status: "abandoned", fromSignup: true });
    expect(googleRedirectOutcome({ user }, "login", {
      hadPendingRedirect: false,
      navigationType: "back_forward",
    }).status).toBe("success");
  });

  it("does not show didn't finish for an empty popup return on a phone", () => {
    expect(isAbandonedGoogleRedirect({
      popupReturn: true,
      hadPendingRedirect: true,
      navigationType: "navigate",
    })).toBe(true);
    expect(googleRedirectOutcome(null, "login", {
      popupReturn: true,
      hadPendingRedirect: true,
      navigationType: "navigate",
    })).toEqual({ status: "abandoned", fromSignup: false });
    expect(googleRedirectOutcome(null, "signup", {
      popupReturn: true,
      hadPendingRedirect: true,
      navigationType: "navigate",
    })).toEqual({ status: "abandoned", fromSignup: true });
    expect(googleRedirectOutcome({ user }, "login", {
      popupReturn: true,
      hadPendingRedirect: true,
      navigationType: "navigate",
    }).status).toBe("success");
    expect(googleRedirectOutcome(null, "login", {
      popupReturn: false,
      hadPendingRedirect: true,
      navigationType: "navigate",
    }).message).toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });
});

describe("hadPendingGoogleRedirect", () => {
  it("reads the flag Firebase stores before leaving for Google", () => {
    const storage = memoryStorage();
    const key = firebasePendingRedirectKey("api-key", "[DEFAULT]");
    expect(key).toBe("firebase:pendingRedirect:api-key:[DEFAULT]");
    expect(hadPendingGoogleRedirect(storage, "api-key", "[DEFAULT]")).toBe(false);
    storage.setItem(key, JSON.stringify("true"));
    expect(hadPendingGoogleRedirect(storage, "api-key", "[DEFAULT]")).toBe(true);
    expect(hadPendingGoogleRedirect(storage, "", "[DEFAULT]")).toBe(false);
    expect(readPageNavigationType({
      getEntriesByType: () => [{ type: "back_forward" }],
    })).toBe("back_forward");
    expect(readPageNavigationType(null)).toBe("");
    clearPendingGoogleRedirect(storage, "api-key", "[DEFAULT]");
    expect(hadPendingGoogleRedirect(storage, "api-key", "[DEFAULT]")).toBe(false);
    const blocked = {
      removeItem() { throw new Error("blocked"); },
    };
    expect(() => clearPendingGoogleRedirect(blocked, "api-key", "[DEFAULT]")).not.toThrow();
    expect(() => clearPendingGoogleRedirect(null, "api-key", "[DEFAULT]")).not.toThrow();
  });
});

describe("startGoogleSignIn", () => {
  const provider = { providerId: "google.com" };
  const popupAuth = { name: "popup" };
  const redirectAuth = { name: "redirect" };

  it("redirects on mobile and does not open a popup", async () => {
    const storage = memoryStorage();
    const signInWithPopup = jest.fn();
    const signInWithRedirect = jest.fn(() => Promise.resolve());
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: true,
      storage,
      signInWithPopup,
      signInWithRedirect,
    });
    expect(outcome).toEqual({ status: "redirecting" });
    expect(signInWithPopup).not.toHaveBeenCalled();
    expect(signInWithRedirect).toHaveBeenCalledWith(redirectAuth, provider);
    expect(peekGoogleRedirectIntent(storage)).toBe("login");
  });

  it("clears a leftover redirect flag before the iPhone Safari popup", async () => {
    const storage = memoryStorage();
    rememberGoogleRedirectIntent(storage, false);
    const user = { displayName: "A", email: "a@b.com" };
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      allowRedirectFallback: false,
      storage,
      signInWithPopup: jest.fn(() => Promise.resolve({ user })),
      signInWithRedirect: jest.fn(),
    });
    expect(outcome).toEqual({ status: "success", user });
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });

  it("uses a popup on desktop and returns the Google user", async () => {
    const storage = memoryStorage();
    const user = { displayName: "A", email: "a@b.com" };
    const signInWithPopup = jest.fn(() => Promise.resolve({ user }));
    const signInWithRedirect = jest.fn();
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      storage,
      signInWithPopup,
      signInWithRedirect,
    });
    expect(outcome).toEqual({ status: "success", user });
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });

  it("falls back to redirect when the popup is blocked", async () => {
    const storage = memoryStorage();
    const blocked = Object.assign(new Error("blocked"), { code: "auth/popup-blocked" });
    const signInWithPopup = jest.fn(() => Promise.reject(blocked));
    const signInWithRedirect = jest.fn(() => Promise.resolve());
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: true,
      useRedirect: false,
      storage,
      signInWithPopup,
      signInWithRedirect,
    });
    expect(shouldFallbackToRedirect(blocked)).toBe(true);
    expect(outcome).toEqual({ status: "redirecting" });
    expect(signInWithRedirect).toHaveBeenCalledWith(redirectAuth, provider);
    expect(peekGoogleRedirectIntent(storage)).toBe("signup");
  });

  it.each([
    ["auth/network-request-failed", "Firebase: Error (auth/network-request-failed)."],
    ["auth/internal-error", "Firebase: Error (auth/internal-error)."],
    ["auth/cancelled-popup-request", "Firebase: Error (auth/cancelled-popup-request)."],
  ])("falls back to redirect when the popup fails with %s", async (code, message) => {
    const storage = memoryStorage();
    const error = Object.assign(new Error(message), { code });
    const signInWithPopup = jest.fn(() => Promise.reject(error));
    const signInWithRedirect = jest.fn(() => Promise.resolve());
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      storage,
      signInWithPopup,
      signInWithRedirect,
    });
    expect(shouldFallbackToRedirect(error)).toBe(true);
    expect(outcome).toEqual({ status: "redirecting" });
    expect(signInWithRedirect).toHaveBeenCalledWith(redirectAuth, provider);
  });

  it("falls back to redirect when the popup error message mentions a network failure", async () => {
    const storage = memoryStorage();
    const error = new Error("Network error");
    const signInWithRedirect = jest.fn(() => Promise.resolve());
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      storage,
      signInWithPopup: jest.fn(() => Promise.reject(error)),
      signInWithRedirect,
    });
    expect(shouldFallbackToRedirect(error)).toBe(true);
    expect(shouldFallbackToRedirect(new Error("popup closed"))).toBe(false);
    expect(outcome).toEqual({ status: "redirecting" });
    expect(signInWithRedirect).toHaveBeenCalledTimes(1);
  });

  it("does not turn a blocked iPhone popup into a redirect that cannot finish", async () => {
    const storage = memoryStorage();
    const blocked = Object.assign(new Error("blocked"), { code: "auth/popup-blocked" });
    const signInWithRedirect = jest.fn(() => Promise.resolve());
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      allowRedirectFallback: false,
      storage,
      signInWithPopup: jest.fn(() => Promise.reject(blocked)),
      signInWithRedirect,
    });
    expect(outcome).toEqual({ status: "error", error: blocked });
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });

  it("does not redirect when the person closes the popup", async () => {
    const storage = memoryStorage();
    const closed = Object.assign(new Error("closed"), { code: "auth/popup-closed-by-user" });
    const signInWithPopup = jest.fn(() => Promise.reject(closed));
    const signInWithRedirect = jest.fn();
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      storage,
      signInWithPopup,
      signInWithRedirect,
    });
    expect(outcome).toEqual({ status: "cancelled" });
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });

  it("restores login when the popup closes before Firebase notices", async () => {
    const storage = memoryStorage();
    const signInWithRedirect = jest.fn();
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      allowRedirectFallback: true,
      storage,
      signInWithPopup: () => new Promise(() => {}),
      signInWithRedirect,
      getPopup: () => ({ closed: true }),
    });
    expect(outcome).toEqual({ status: "cancelled" });
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  it("restores login when COOP blocks window.closed and sign-in never settles", async () => {
    const storage = memoryStorage();
    const signInWithRedirect = jest.fn();
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: true,
      useRedirect: false,
      allowRedirectFallback: false,
      storage,
      signInWithPopup: () => new Promise(() => {}),
      signInWithRedirect,
      getPopup: () => ({
        get closed() {
          throw new Error("Cross-Origin-Opener-Policy policy would block the window.closed call.");
        },
      }),
    });
    expect(outcome).toEqual({ status: "cancelled" });
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });

  it("still returns the Google user while the popup is open", async () => {
    const user = { displayName: "A", email: "a@b.com" };
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      storage: memoryStorage(),
      signInWithPopup: jest.fn(() => Promise.resolve({ user })),
      signInWithRedirect: jest.fn(),
      getPopup: () => ({ closed: false }),
      intervalMs: 5000,
    });
    expect(outcome).toEqual({ status: "success", user });
  });

  it("clears the stored intent when redirect fails to start", async () => {
    const storage = memoryStorage();
    const error = Object.assign(new Error("no storage"), { code: "auth/web-storage-unsupported" });
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: true,
      storage,
      signInWithPopup: jest.fn(),
      signInWithRedirect: jest.fn(() => Promise.reject(error)),
    });
    expect(outcome).toEqual({ status: "error", error });
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });
});

describe("loadGoogleRedirectResult", () => {
  afterEach(() => {
    resetGoogleRedirectResultForTests();
  });

  it("calls getRedirectResult once", async () => {
    const getRedirectResult = jest.fn(() => Promise.resolve({ user: { email: "a@b.com" } }));
    const auth = { name: "redirect" };
    const first = loadGoogleRedirectResult(auth, getRedirectResult);
    const second = loadGoogleRedirectResult(auth, getRedirectResult);
    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ user: { email: "a@b.com" } });
    expect(getRedirectResult).toHaveBeenCalledTimes(1);
    expect(getRedirectResult).toHaveBeenCalledWith(auth);
  });
});

describe("adoptRedirectUser", () => {
  it("keeps the redirect user when both auth instances are the same", async () => {
    const auth = { name: "default" };
    const user = { uid: "1" };
    const signInWithCredential = jest.fn();
    const adopted = await adoptRedirectUser({
      primaryAuth: auth,
      redirectAuth: auth,
      result: { user },
      credentialFromResult: jest.fn(),
      signInWithCredential,
    });
    expect(adopted).toBe(user);
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("copies the Google credential onto the primary app", async () => {
    const primaryUser = { uid: "1", email: "a@b.com" };
    const credential = { providerId: "google.com" };
    const signInWithCredential = jest.fn(() => Promise.resolve({ user: primaryUser }));
    const signOut = jest.fn(() => Promise.resolve());
    const result = { user: { uid: "1" } };
    const adopted = await adoptRedirectUser({
      primaryAuth: { name: "primary" },
      redirectAuth: { name: "redirect" },
      result,
      credentialFromResult: () => credential,
      signInWithCredential,
      signOut,
    });
    expect(adopted).toBe(primaryUser);
    expect(signInWithCredential).toHaveBeenCalledWith({ name: "primary" }, credential);
    expect(signOut).toHaveBeenCalledWith({ name: "redirect" });
  });

  it("returns null when there is no redirect result", async () => {
    await expect(adoptRedirectUser({
      primaryAuth: {},
      redirectAuth: {},
      result: null,
      credentialFromResult: jest.fn(),
      signInWithCredential: jest.fn(),
    })).resolves.toBeNull();
  });

  it("throws a mapped error when the credential is missing", async () => {
    await expect(adoptRedirectUser({
      primaryAuth: { name: "primary" },
      redirectAuth: { name: "redirect" },
      result: { user: { uid: "1" } },
      credentialFromResult: () => null,
      signInWithCredential: jest.fn(),
    })).rejects.toMatchObject({ code: "auth/missing-google-credential" });
  });
});
