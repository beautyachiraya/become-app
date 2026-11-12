import {
  FIREBASE_AUTH_DOMAIN,
  PRODUCTION_APP_HOST,
  GOOGLE_REDIRECT_INTENT_KEY,
  GOOGLE_REDIRECT_INCOMPLETE,
  resolveAuthDomain,
  prefersGoogleRedirect,
  prefersGoogleRelay,
  prefersGoogleIdTokenRedirect,
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
  immediateGoogleScreen,
  userFromFinishedPick,
  redirectResultContext,
  userFromPopupOpener,
  GOOGLE_AUTH_RELAY_NAME,
  GOOGLE_AUTH_RELAY_ORIGIN,
  googleAuthRelayUrl,
  parseRelayRpc,
  relayAckMessage,
  relayReplyForMessage,
  googleIdpSignInBody,
  userFromGoogleRelayEvent,
  startIphoneGoogleSignIn,
  listenForGoogleRelay,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_ID_TOKEN_REQUEST_KEY,
  googleIdTokenRedirectUri,
  buildGoogleIdTokenAuthUrl,
  randomGoogleOAuthValue,
  rememberGoogleIdTokenRequest,
  peekGoogleIdTokenRequest,
  takeGoogleIdTokenRequest,
  parseJwtPayload,
  readGoogleOAuthReturn,
  googleIdTokenReturnOutcome,
  consumeGoogleIdTokenReturn,
  startGoogleIdTokenRedirect,
  finishGoogleIdTokenSignIn,
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
  it("keeps a popup on Android and a narrow desktop window, and uses an ID token return on iPhone", () => {
    expect(prefersGoogleRedirect({ userAgent: IPHONE_SAFARI })).toBe(false);
    expect(prefersGoogleRelay({ userAgent: IPHONE_SAFARI })).toBe(false);
    expect(prefersGoogleIdTokenRedirect({ userAgent: IPHONE_SAFARI })).toBe(true);
    expect(prefersGoogleRedirect({ userAgent: ANDROID_CHROME })).toBe(false);
    expect(prefersGoogleRelay({ userAgent: ANDROID_CHROME })).toBe(false);
    expect(prefersGoogleIdTokenRedirect({ userAgent: ANDROID_CHROME })).toBe(false);
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
    expect(prefersGoogleRelay({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    })).toBe(false);
    expect(prefersGoogleIdTokenRedirect({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    })).toBe(true);
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

  it("uses the ID token return on iPhone in-app browsers and the home-screen icon too", () => {
    const instagram = {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.0.0",
    };
    expect(prefersGoogleRedirect(instagram)).toBe(false);
    expect(prefersGoogleRelay(instagram)).toBe(false);
    expect(prefersGoogleIdTokenRedirect(instagram)).toBe(true);
    expect(prefersGoogleRedirect({
      userAgent: IPHONE_SAFARI,
      standalone: true,
    })).toBe(false);
    expect(prefersGoogleRelay({
      userAgent: IPHONE_SAFARI,
      standalone: true,
    })).toBe(false);
    expect(prefersGoogleIdTokenRedirect({
      userAgent: IPHONE_SAFARI,
      standalone: true,
    })).toBe(true);
    expect(prefersGoogleRedirect({
      userAgent: IPHONE_SAFARI,
      standalone: false,
    })).toBe(false);
    expect(prefersGoogleRelay({
      userAgent: IPHONE_SAFARI,
      standalone: false,
    })).toBe(false);
    expect(prefersGoogleIdTokenRedirect({
      userAgent: IPHONE_SAFARI,
      standalone: false,
    })).toBe(true);
  });

  it("still uses a Firebase redirect from an Android in-app browser", () => {
    const androidInstagram = {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 320.0.0.0.0",
    };
    expect(prefersGoogleRedirect(androidInstagram)).toBe(true);
    expect(prefersGoogleIdTokenRedirect(androidInstagram)).toBe(false);
  });
});

describe("shouldPrimeGooglePopup", () => {
  it("opens the window during the tap on phones that use a popup", () => {
    expect(shouldPrimeGooglePopup({ userAgent: IPHONE_SAFARI })).toBe(false);
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
    expect(html).toContain("readWindow");
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
      if (setup.windowValue) sandbox[GOOGLE_POPUP_URL_KEY] = setup.windowValue;
      sandbox.timers = timers;
      sandbox.window = sandbox;
      sandbox.window.addEventListener = jest.fn();
      vm.createContext(sandbox);
      vm.runInContext(match[1], sandbox);
      return { location, sessionData, localData, sandbox };
    }

    const fromWindow = runStartPage({
      windowValue: handler,
    });
    expect(fromWindow.location.replace).toHaveBeenCalledTimes(1);
    expect(fromWindow.location.replace).toHaveBeenCalledWith(handler);

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

  it("does not move the phone popup, because Safari would drop window.opener", () => {
    let opener = { page: "app" };
    const assigned = [];
    const popup = popupWindow();
    Object.defineProperty(popup, "opener", { get: () => opener });
    popup.location = {
      href: "https://become-app-rho.vercel.app/google-auth-start.html",
      replace(url) {
        assigned.push(url);
        opener = null;
      },
      set href(url) {
        assigned.push(url);
        opener = null;
      },
    };
    const origin = "https://become-app-rho.vercel.app";
    const nativeOpen = jest.fn(() => popup);
    const win = { location: { origin }, open: nativeOpen };
    const release = beginGooglePopupGesture(win, true);
    expect(nativeOpen).toHaveBeenCalledWith(
      origin + GOOGLE_AUTH_START_PATH,
      "become-google-auth"
    );
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    expect(win.open(handler, "event", "width=500")).toBe(popup);
    expect(assigned).toEqual([]);
    expect(popup.opener).toEqual({ page: "app" });
    expect(popup[GOOGLE_POPUP_URL_KEY]).toBe(handler);
    expect(popup.data[GOOGLE_POPUP_URL_KEY]).toBe(handler);
    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: GOOGLE_POPUP_NAV_MESSAGE, url: handler },
      origin
    );
    expect(popup.focus).toHaveBeenCalled();
    // Not assigning from the parent keeps opener only until the popup itself
    // leaves for Google. That later hop is what iPhone Safari actually does.
    expect(popup.opener).toEqual({ page: "app" });
    win.open("https://other.example/", "_blank");
    expect(nativeOpen).toHaveBeenLastCalledWith("https://other.example/", "_blank");
    release();
    expect(popup.close).not.toHaveBeenCalled();
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

  it("opens the iPhone relay with the real window.open and leaves the account chooser in place", () => {
    const origin = "https://become-app-rho.vercel.app";
    const chooser = popupWindow();
    const relay = popupWindow();
    const nativeOpen = jest.fn()
      .mockReturnValueOnce(chooser)
      .mockReturnValueOnce(relay);
    const win = { location: { origin }, open: nativeOpen };
    const release = beginGooglePopupGesture(win, true);
    const relayUrl = googleAuthRelayUrl({
      apiKey: "api-key",
      parentOrigin: origin,
    });
    expect(release.openRelay(relayUrl)).toBe(relay);
    expect(nativeOpen).toHaveBeenLastCalledWith(relayUrl, GOOGLE_AUTH_RELAY_NAME);
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    expect(win.open(handler, "firebase")).toBe(chooser);
    expect(chooser[GOOGLE_POPUP_URL_KEY]).toBe(handler);
    expect(release.popup()).toBe(chooser);
    release();
    expect(chooser.close).not.toHaveBeenCalled();
  });
});

describe("iPhone Safari popup cannot return an account", () => {
  const origin = "https://become-app-rho.vercel.app";
  const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
  const account = { displayName: "Achiraya", email: "a@example.com" };

  it("drops the account when the popup follows Google, even if the login page never assigns a URL", () => {
    const popup = {
      opener: { page: "login" },
      location: {
        href: origin + GOOGLE_AUTH_START_PATH,
        replace(url) {
          const next = new URL(url);
          // iPhone Safari clears window.opener on this cross-origin hop.
          // The login page is not the one assigning the address.
          if (next.origin !== origin) this.owner.opener = null;
          this.href = url;
        },
      },
    };
    popup.location.owner = popup;

    expect(isFirebaseAuthHandlerUrl(handler)).toBe(true);
    popup.location.replace(handler);

    expect(popup.location.href).toBe(handler);
    expect(popup.opener).toBeNull();
    expect(userFromPopupOpener(popup.opener, account)).toBeNull();
    expect(immediateGoogleScreen({ status: "success", user: userFromPopupOpener(popup.opener, account) }).screen).toBe("login");
    expect(immediateGoogleScreen({ status: "cancelled" })).toEqual({ screen: "login", message: "" });
    // The lost opener is why a popup cannot finish on iPhone Safari.
    // The current path leaves this page and comes back with an ID token.
    expect(prefersGoogleRedirect({ userAgent: IPHONE_SAFARI })).toBe(false);
    expect(prefersGoogleRelay({ userAgent: IPHONE_SAFARI })).toBe(false);
    expect(prefersGoogleIdTokenRedirect({ userAgent: IPHONE_SAFARI })).toBe(true);
    expect(shouldPrimeGooglePopup({ userAgent: IPHONE_SAFARI })).toBe(false);
  });

  it("still returns the account on desktop, where the popup opener stays", () => {
    const desktop = {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
    };
    expect(prefersGoogleRedirect(desktop)).toBe(false);
    expect(userFromPopupOpener({ page: "login" }, account)).toBe(account);
    expect(immediateGoogleScreen({ status: "success", user: account })).toEqual({
      screen: "app",
      message: "",
      user: account,
    });
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
    expect(outcome.status).toBe("cancelled");
    expect(outcome.reason).toBe("closed");
    expect(outcome.whenUser).toEqual(expect.any(Promise));
    expect(immediateGoogleScreen(outcome)).toEqual({ screen: "login", message: "" });
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
    expect(outcome.status).toBe("cancelled");
    expect(outcome.reason).toBe("unavailable");
    expect(immediateGoogleScreen(outcome).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });

  it("still returns the picked account after Safari hides window.closed", async () => {
    let finishPick;
    const user = { displayName: "Achiraya", email: "a@example.com" };
    const outcome = await finishPopupSignIn({
      signIn: () => new Promise((resolve) => { finishPick = resolve; }),
      getPopup: () => ({
        get closed() {
          throw new Error("Cross-Origin-Opener-Policy policy would block the window.closed call.");
        },
      }),
      intervalMs: 1000,
    });
    expect(immediateGoogleScreen(outcome)).toEqual({ screen: "login", message: "" });
    finishPick({ user });
    await expect(userFromFinishedPick(outcome)).resolves.toBe(user);
    expect(immediateGoogleScreen({ status: "success", user })).toEqual({
      screen: "app",
      message: "",
      user,
    });
    expect(immediateGoogleScreen({ status: "success", user }).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
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

  it("does not paint didn't finish when iPhone Safari's redirect comes back empty", () => {
    const user = { displayName: "Achiraya", email: "a@example.com" };
    const iphone = redirectResultContext(
      { userAgent: IPHONE_SAFARI },
      { hadPendingRedirect: true, navigationType: "navigate" }
    );
    // A normal Safari tab no longer uses this redirect. An empty forward
    // return is the partitioned-iframe result from the previous version:
    // there is no user for the banner to describe, and it must stay quiet.
    // A user in the result is still Home.
    expect(iphone.popupReturn).toBe(true);
    expect(googleRedirectOutcome({ user }, "login", iphone)).toEqual({
      status: "success",
      fromSignup: false,
      profile: { name: "Achiraya", email: "a@example.com", phone: "" },
    });
    expect(googleRedirectOutcome(null, "login", iphone)).toEqual({
      status: "abandoned",
      fromSignup: false,
    });
    expect(googleRedirectOutcome(null, "login", iphone).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
    expect(googleRedirectOutcome(null, "login", {
      hadPendingRedirect: true,
      navigationType: "back_forward",
    })).toEqual({ status: "abandoned", fromSignup: false });
    expect(googleRedirectOutcome(null, "login", {
      hadPendingRedirect: true,
      navigationType: "back_forward",
      restoredFromCache: true,
    }).status).toBe("abandoned");
    expect(redirectResultContext(
      { userAgent: IPHONE_SAFARI, standalone: true },
      { hadPendingRedirect: true, navigationType: "navigate" }
    ).popupReturn).toBe(true);
    expect(googleRedirectOutcome(null, "login", redirectResultContext(
      { userAgent: IPHONE_SAFARI, standalone: true },
      { hadPendingRedirect: true, navigationType: "navigate" }
    )).status).toBe("abandoned");
    expect(googleRedirectOutcome(null, "login", redirectResultContext(
      { userAgent: IPHONE_SAFARI, standalone: true },
      { hadPendingRedirect: true, navigationType: "navigate" }
    )).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
    expect(redirectResultContext(
      {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      },
      { hadPendingRedirect: true, navigationType: "navigate" }
    ).popupReturn).toBe(true);

    const desktop = redirectResultContext(
      {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
      },
      { hadPendingRedirect: true, navigationType: "navigate" }
    );
    expect(desktop.popupReturn).toBe(false);
    expect(googleRedirectOutcome(null, "login", desktop).message).toBe(GOOGLE_REDIRECT_INCOMPLETE);
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

  it("does not send iPhone Safari through a popup or a Firebase redirect", async () => {
    const storage = memoryStorage();
    const env = { userAgent: IPHONE_SAFARI };
    expect(prefersGoogleRedirect(env)).toBe(false);
    expect(prefersGoogleRelay(env)).toBe(false);
    expect(prefersGoogleIdTokenRedirect(env)).toBe(true);
    expect(shouldPrimeGooglePopup(env)).toBe(false);
    const signInWithPopup = jest.fn();
    const signInWithRedirect = jest.fn();
    const assign = jest.fn();
    const outcome = await startGoogleIdTokenRedirect({
      storage,
      fromSignup: false,
      origin: "https://become-app-rho.vercel.app",
      assign,
      randomBytes: (bytes) => bytes.fill(7),
    });
    expect(outcome).toEqual({ status: "redirecting" });
    expect(signInWithPopup).not.toHaveBeenCalled();
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledTimes(1);
    const url = assign.mock.calls[0][0];
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(url).toContain("client_id=" + GOOGLE_WEB_CLIENT_ID);
    expect(url).toContain("redirect_uri=" + encodeURIComponent("https://become-app-rho.vercel.app/"));
    expect(url).toContain("response_type=id_token");
    expect(url).not.toContain("__/auth/handler");
    expect(peekGoogleRedirectIntent(storage)).toBe("");
    expect(peekGoogleIdTokenRequest(storage)).toEqual({
      state: "07".repeat(32),
      nonce: "07".repeat(32),
      fromSignup: false,
      redirectUri: "https://become-app-rho.vercel.app/",
    });
    const returned = googleRedirectOutcome(null, "login", redirectResultContext(
      env,
      { hadPendingRedirect: true, navigationType: "navigate" }
    ));
    expect(returned).toEqual({ status: "abandoned", fromSignup: false });
    expect(returned.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });

  it("does not show the red line when iPhone Safari leaves Google without an account", async () => {
    const storage = memoryStorage();
    rememberGoogleRedirectIntent(storage, false);
    const context = redirectResultContext(
      { userAgent: IPHONE_SAFARI },
      { hadPendingRedirect: true, navigationType: "back_forward" }
    );
    expect(googleRedirectOutcome(null, takeGoogleRedirectIntent(storage), context)).toEqual({
      status: "abandoned",
      fromSignup: false,
    });
    expect(immediateGoogleScreen({ status: "cancelled" })).toEqual({ screen: "login", message: "" });
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
    expect(outcome.status).toBe("cancelled");
    expect(immediateGoogleScreen(outcome).message).toBe("");
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
    expect(outcome.status).toBe("cancelled");
    expect(outcome.whenUser).toEqual(expect.any(Promise));
    expect(immediateGoogleScreen(outcome)).toEqual({ screen: "login", message: "" });
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(peekGoogleRedirectIntent(storage)).toBe("");
  });

  it("opens Home when the account pick finishes after Safari hides window.closed", async () => {
    let finishPick;
    const user = { displayName: "Achiraya", email: "a@example.com" };
    const storage = memoryStorage();
    const outcome = await startGoogleSignIn({
      popupAuth,
      redirectAuth,
      provider,
      fromSignup: false,
      useRedirect: false,
      allowRedirectFallback: false,
      storage,
      signInWithPopup: () => new Promise((resolve) => { finishPick = resolve; }),
      signInWithRedirect: jest.fn(),
      getPopup: () => ({
        get closed() {
          throw new Error("Cross-Origin-Opener-Policy policy would block the window.closed call.");
        },
      }),
    });
    expect(outcome.status).toBe("cancelled");
    expect(immediateGoogleScreen(outcome)).toEqual({ screen: "login", message: "" });
    expect(peekGoogleRedirectIntent(storage)).toBe("");
    finishPick({ user });
    await expect(userFromFinishedPick(outcome)).resolves.toBe(user);
    expect(googleRedirectOutcome({ user }, "login", redirectResultContext(
      { userAgent: IPHONE_SAFARI },
      { hadPendingRedirect: true, navigationType: "navigate" }
    )).status).toBe("success");
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

describe("iPhone Google relay", () => {
  const origin = "https://become-app-rho.vercel.app";
  const apiKey = "AIzaSyBnN0Skhq_y2azpES-ccv_yv9voxa2JyXg";
  const handlerUrl = "https://become-app-dde78.firebaseapp.com/__/auth/handler?apiKey=" + apiKey + "&code=fakecode";
  const picked = {
    type: "signInViaPopup",
    eventId: "evt-popup",
    urlResponse: handlerUrl,
    sessionId: "sess-popup",
    postBody: "providerId=google.com",
    tenantId: null,
    error: null,
  };

  function rpc(service, callId, arg) {
    return "!_" + JSON.stringify({
      s: service,
      f: GOOGLE_AUTH_RELAY_NAME,
      r: "..",
      c: callId,
      a: [arg],
      g: false,
    });
  }

  it("builds a top-level helper URL whose parent is this page", () => {
    const url = new URL(googleAuthRelayUrl({ apiKey, parentOrigin: origin }));
    expect(url.origin).toBe(GOOGLE_AUTH_RELAY_ORIGIN);
    expect(url.pathname).toBe("/__/auth/iframe");
    expect(url.searchParams.get("apiKey")).toBe(apiKey);
    expect(url.searchParams.get("appName")).toBe("[DEFAULT]");
    expect(url.searchParams.get("v")).toBe("10.12.0");
    expect(url.searchParams.get("parent")).toBe(origin);
    expect(url.searchParams.get("id")).toBe("become-relay");
    expect(googleAuthRelayUrl({ apiKey: "", parentOrigin: origin })).toBe("");
  });

  it("acks the helper and keeps an empty event off the red line", () => {
    const empty = rpc("..:become-relay:authEvent", 2, {
      type: "authEvent",
      authEvent: {
        type: "unknown",
        eventId: null,
        urlResponse: null,
        sessionId: null,
        postBody: null,
        tenantId: null,
        error: { code: "auth/no-auth-event", message: "An internal error has occurred." },
      },
    });
    const reply = relayReplyForMessage({
      origin: GOOGLE_AUTH_RELAY_ORIGIN,
      data: empty,
    });
    expect(reply.account).toBeNull();
    expect(parseRelayRpc(reply.ack)).toEqual({
      s: "__cb",
      f: "..",
      r: "..",
      c: null,
      a: [2, [{ status: "ACK" }]],
      g: false,
    });
    expect(relayAckMessage({ c: null })).toBe("");
    expect(relayReplyForMessage({ origin: "https://evil.example", data: empty })).toBeNull();
    expect(relayReplyForMessage({ origin: GOOGLE_AUTH_RELAY_ORIGIN, data: "hello" })).toBeNull();
    expect(relayReplyForMessage({
      origin: GOOGLE_AUTH_RELAY_ORIGIN,
      data: rpc("_g_rpcReady", 1, null),
    }).account).toBeNull();
  });

  it("reads a picked account and ignores a closed chooser", () => {
    const reply = relayReplyForMessage({
      origin: GOOGLE_AUTH_RELAY_ORIGIN,
      data: rpc("/become-relay::authEvent", 3, { type: "authEvent", authEvent: picked }),
    });
    expect(reply.account.event.urlResponse).toBe(handlerUrl);
    expect(reply.account.event.sessionId).toBe("sess-popup");
    const cancelled = relayReplyForMessage({
      origin: GOOGLE_AUTH_RELAY_ORIGIN,
      data: rpc("authEvent", 4, {
        type: "authEvent",
        authEvent: {
          type: "unknown",
          error: { code: "auth/user-cancelled", message: "The popup has been closed by the user." },
        },
      }),
    });
    expect(cancelled.account).toBeNull();
    expect(cancelled.ack).toContain("__cb");
  });

  it("posts the ack back to the relay window", () => {
    const source = { postMessage: jest.fn() };
    const seen = [];
    const listeners = new Set();
    const win = {
      addEventListener(_type, fn) { listeners.add(fn); },
      removeEventListener(_type, fn) { listeners.delete(fn); },
    };
    function emit(event) {
      [...listeners].forEach((fn) => fn(event));
    }
    const message = {
      origin: GOOGLE_AUTH_RELAY_ORIGIN,
      data: rpc("authEvent", 3, { type: "authEvent", authEvent: picked }),
      source,
    };
    const stop = listenForGoogleRelay(win, (account) => seen.push(account));
    emit(message);
    expect(source.postMessage).toHaveBeenCalledWith(
      relayAckMessage(parseRelayRpc(message.data)),
      GOOGLE_AUTH_RELAY_ORIGIN
    );
    expect(seen).toHaveLength(1);
    stop();
    emit(message);
    expect(seen).toHaveLength(1);
  });

  it("finishes sign-in from the relay account without the incomplete banner", async () => {
    const user = { displayName: "Achiraya", email: "a@example.com" };
    const fetchImpl = jest.fn(async (url, init) => {
      expect(url).toBe("https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=" + encodeURIComponent(apiKey));
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual(googleIdpSignInBody(picked));
      expect(JSON.parse(init.body).requestUri).toBe(handlerUrl);
      return {
        ok: true,
        json: async () => ({ oauthIdToken: "id-token", oauthAccessToken: "access-token" }),
      };
    });
    const credential = { providerId: "google.com" };
    const signInWithCredential = jest.fn(async () => ({ user }));
    const signedIn = await userFromGoogleRelayEvent({
      event: picked,
      apiKey,
      auth: { name: "auth" },
      fetchImpl,
      signInWithCredential,
      credentialFromTokens: (idToken, accessToken) => {
        expect(idToken).toBe("id-token");
        expect(accessToken).toBe("access-token");
        return credential;
      },
    });
    expect(signedIn).toBe(user);
    expect(signInWithCredential).toHaveBeenCalledWith({ name: "auth" }, credential);
    expect(immediateGoogleScreen({ status: "success", user: signedIn })).toEqual({
      screen: "app",
      message: "",
      user,
    });

    const failed = {
      ok: false,
      json: async () => ({ error: { message: "INVALID_IDP_RESPONSE" } }),
    };
    await expect(userFromGoogleRelayEvent({
      event: picked,
      apiKey,
      auth: { name: "auth" },
      fetchImpl: async () => failed,
      signInWithCredential,
      credentialFromTokens: () => credential,
    })).rejects.toMatchObject({ code: "auth/internal-error" });

    await expect(userFromGoogleRelayEvent({
      event: picked,
      apiKey,
      auth: { name: "auth" },
      fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
      signInWithCredential,
      credentialFromTokens: () => null,
    })).rejects.toMatchObject({ code: "auth/missing-google-credential" });
  });

  it("lands on Home when the relay brings the account back after the popup looks closed", async () => {
    const user = { displayName: "Achiraya", email: "a@example.com" };
    let deliver;
    const outcomePromise = startIphoneGoogleSignIn({
      popupAuth: { name: "popup" },
      provider: { providerId: "google.com" },
      storage: memoryStorage(),
      signInWithPopup: () => new Promise(() => {}),
      getPopup: () => ({ closed: true }),
      waitForRelayUser: () => new Promise((resolve) => { deliver = resolve; }),
      graceMs: 500,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(typeof deliver).toBe("function");
    deliver(user);
    await expect(outcomePromise).resolves.toEqual({ status: "success", user });
    await expect(outcomePromise.then((outcome) => immediateGoogleScreen(outcome).screen)).resolves.toBe("app");
  });

  it("returns the relay user when the popup never settles", async () => {
    const user = { displayName: "Achiraya", email: "a@example.com" };
    const signInWithRedirect = jest.fn();
    const outcome = await startIphoneGoogleSignIn({
      popupAuth: { name: "popup" },
      provider: { providerId: "google.com" },
      storage: memoryStorage(),
      signInWithPopup: () => new Promise(() => {}),
      getPopup: () => ({ closed: false }),
      intervalMs: 5000,
      waitForRelayUser: () => Promise.resolve(user),
      graceMs: 20,
    });
    expect(outcome).toEqual({ status: "success", user });
    expect(signInWithRedirect).not.toHaveBeenCalled();
    expect(immediateGoogleScreen(outcome).screen).toBe("app");
    expect(immediateGoogleScreen(outcome).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });

  it("does not show the red line when the iPhone popup closes with no account", async () => {
    const outcome = await startIphoneGoogleSignIn({
      popupAuth: { name: "popup" },
      provider: { providerId: "google.com" },
      storage: memoryStorage(),
      signInWithPopup: () => new Promise(() => {}),
      getPopup: () => ({ closed: true }),
      waitForRelayUser: () => new Promise(() => {}),
      graceMs: 15,
    });
    expect(outcome.status).toBe("cancelled");
    expect(immediateGoogleScreen(outcome)).toEqual({ screen: "login", message: "" });
    expect(outcome.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });

  it("keeps listening when Safari hides window.closed and the account arrives later", async () => {
    const user = { displayName: "Achiraya", email: "a@example.com" };
    let deliver;
    const outcome = await startIphoneGoogleSignIn({
      popupAuth: { name: "popup" },
      provider: { providerId: "google.com" },
      storage: memoryStorage(),
      signInWithPopup: () => new Promise(() => {}),
      getPopup: () => ({
        get closed() {
          throw new Error("Cross-Origin-Opener-Policy");
        },
      }),
      waitForRelayUser: () => new Promise((resolve) => { deliver = resolve; }),
      graceMs: 20,
    });
    expect(outcome.status).toBe("cancelled");
    expect(immediateGoogleScreen(outcome)).toEqual({ screen: "login", message: "" });
    deliver(user);
    await expect(outcome.whenUser).resolves.toBe(user);
    expect(immediateGoogleScreen({ status: "success", user }).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });
});

function jwtWithNonce(nonce) {
  const payload = Buffer.from(JSON.stringify({
    nonce,
    aud: GOOGLE_WEB_CLIENT_ID,
    iss: "https://accounts.google.com",
    email: "a@example.com",
  })).toString("base64url");
  return "eyJhbGciOiJub25lIn0." + payload + ".sig";
}

describe("iPhone Google ID token return", () => {
  const origin = "https://become-app-rho.vercel.app";
  const redirectUri = "https://become-app-rho.vercel.app/";

  it("builds a Google URL that returns to the app origin, not the Firebase handler", () => {
    expect(googleIdTokenRedirectUri(origin)).toBe(redirectUri);
    expect(googleIdTokenRedirectUri(origin + "/")).toBe(redirectUri);
    const url = buildGoogleIdTokenAuthUrl({
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri,
      state: "state-1",
      nonce: "nonce-1",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe(GOOGLE_WEB_CLIENT_ID);
    expect(parsed.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(parsed.searchParams.get("response_type")).toBe("id_token");
    expect(parsed.searchParams.get("scope")).toContain("openid");
    expect(parsed.searchParams.get("state")).toBe("state-1");
    expect(parsed.searchParams.get("nonce")).toBe("nonce-1");
    expect(url).not.toContain("__/auth/handler");
  });

  it("signs the user in when Google returns an ID token to this origin", async () => {
    const storage = memoryStorage();
    const request = { state: "abc", nonce: "xyz", fromSignup: false, redirectUri };
    rememberGoogleIdTokenRequest(storage, request);
    const idToken = jwtWithNonce("xyz");
    const hash = "#id_token=" + encodeURIComponent(idToken) + "&state=abc";
    const returned = consumeGoogleIdTokenReturn(hash, storage);
    expect(returned).toEqual({
      status: "success",
      idToken,
      fromSignup: false,
    });
    expect(returned.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
    expect(peekGoogleIdTokenRequest(storage)).toBeNull();

    const user = { displayName: "Achiraya", email: "a@example.com" };
    const credential = { providerId: "google.com", idToken };
    const signInWithCredential = jest.fn(async () => ({ user }));
    const credentialFromIdToken = jest.fn((token) => (token === idToken ? credential : null));
    const signedIn = await finishGoogleIdTokenSignIn({
      idToken: returned.idToken,
      auth: { name: "auth" },
      signInWithCredential,
      credentialFromIdToken,
    });
    expect(credentialFromIdToken).toHaveBeenCalledWith(idToken);
    expect(signInWithCredential).toHaveBeenCalledWith({ name: "auth" }, credential);
    expect(signedIn).toBe(user);
    expect(immediateGoogleScreen({ status: "success", user })).toEqual({
      screen: "app",
      message: "",
      user,
    });
    expect(immediateGoogleScreen({ status: "success", user }).message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });

  it("does not show the red banner when the person cancels or swipes back", () => {
    const storage = memoryStorage();
    rememberGoogleIdTokenRequest(storage, {
      state: "abc",
      nonce: "xyz",
      fromSignup: false,
      redirectUri,
    });
    const cancelled = consumeGoogleIdTokenReturn("#error=access_denied&state=abc", storage);
    expect(cancelled).toEqual({ status: "abandoned", fromSignup: false });
    expect(cancelled.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
    expect(immediateGoogleScreen({ status: "cancelled" })).toEqual({ screen: "login", message: "" });

    rememberGoogleIdTokenRequest(storage, {
      state: "abc",
      nonce: "xyz",
      fromSignup: true,
      redirectUri,
    });
    const backedOut = consumeGoogleIdTokenReturn("", storage, {
      navigationType: "back_forward",
    });
    expect(backedOut).toEqual({ status: "abandoned", fromSignup: true });
    expect(backedOut.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
    expect(peekGoogleIdTokenRequest(storage)).toBeNull();

    rememberGoogleIdTokenRequest(storage, {
      state: "abc",
      nonce: "xyz",
      fromSignup: false,
      redirectUri,
    });
    const leftover = consumeGoogleIdTokenReturn("", storage, {
      navigationType: "navigate",
      hadPendingRedirect: true,
    });
    expect(leftover).toEqual({ status: "abandoned", fromSignup: false });
    expect(leftover.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);
  });

  it("does not sign the user in when the ID token is missing or the state does not match", async () => {
    const storage = memoryStorage();
    rememberGoogleIdTokenRequest(storage, {
      state: "abc",
      nonce: "xyz",
      fromSignup: false,
      redirectUri,
    });
    const mismatch = consumeGoogleIdTokenReturn("#id_token=tok&state=other", storage);
    expect(mismatch.status).toBe("error");
    expect(mismatch.message).not.toBe(GOOGLE_REDIRECT_INCOMPLETE);

    rememberGoogleIdTokenRequest(storage, {
      state: "abc",
      nonce: "xyz",
      fromSignup: false,
      redirectUri,
    });
    const badNonce = consumeGoogleIdTokenReturn(
      "#id_token=" + encodeURIComponent(jwtWithNonce("nope")) + "&state=abc",
      storage
    );
    expect(badNonce.status).toBe("error");

    const signInWithCredential = jest.fn();
    await expect(finishGoogleIdTokenSignIn({
      idToken: "",
      auth: {},
      signInWithCredential,
      credentialFromIdToken: jest.fn(),
    })).rejects.toMatchObject({ code: "auth/missing-google-credential" });
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("stores the request and leaves this page without opening a second window", async () => {
    const storage = memoryStorage();
    const assign = jest.fn();
    const outcome = await startGoogleIdTokenRedirect({
      storage,
      fromSignup: true,
      origin,
      assign,
      randomBytes: (bytes) => bytes.fill(1),
    });
    expect(outcome.status).toBe("redirecting");
    expect(assign.mock.calls.length).toBe(1);
    expect(peekGoogleIdTokenRequest(storage).fromSignup).toBe(true);
    expect(takeGoogleIdTokenRequest(storage).redirectUri).toBe(redirectUri);
    expect(googleIdTokenReturnOutcome("", null).status).toBe("none");
    expect(parseJwtPayload(jwtWithNonce("n")).nonce).toBe("n");
    expect(readGoogleOAuthReturn("#error=access_denied").error).toBe("access_denied");
    expect(randomGoogleOAuthValue((bytes) => bytes.fill(2))).toBe("02".repeat(32));
  });
});
