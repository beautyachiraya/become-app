import {
  FIREBASE_AUTH_DOMAIN,
  PRODUCTION_APP_HOST,
  GOOGLE_REDIRECT_INTENT_KEY,
  GOOGLE_REDIRECT_INCOMPLETE,
  resolveAuthDomain,
  prefersGoogleRedirect,
  shouldPrimeGooglePopup,
  redirectFallbackAllowed,
  beginGooglePopupGesture,
  hadPendingGoogleRedirect,
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

describe("beginGooglePopupGesture", () => {
  function popupWindow() {
    return {
      closed: false,
      location: { href: "about:blank" },
      focus: jest.fn(),
      close: jest.fn(),
    };
  }

  it("navigates the window opened during the tap when Firebase opens one later", () => {
    const popup = popupWindow();
    const nativeOpen = jest.fn(() => popup);
    const win = { open: nativeOpen };
    const release = beginGooglePopupGesture(win, true);
    expect(nativeOpen).toHaveBeenCalledWith("about:blank", "_blank");
    const handler = "https://become-app-dde78.firebaseapp.com/__/auth/handler?authType=signInViaPopup";
    const handed = win.open(handler, "event", "width=500");
    expect(handed).toBe(popup);
    expect(popup.location.href).toBe(handler);
    expect(popup.focus).toHaveBeenCalled();
    win.open("https://other.example/", "_blank");
    expect(nativeOpen).toHaveBeenLastCalledWith("https://other.example/", "_blank");
    release();
    expect(popup.close).not.toHaveBeenCalled();
  });

  it("closes an unused window and does nothing when a popup is not needed", () => {
    const popup = popupWindow();
    const win = { open: jest.fn(() => popup) };
    beginGooglePopupGesture(win, true)();
    expect(popup.close).toHaveBeenCalled();

    const quiet = { open: jest.fn() };
    expect(() => beginGooglePopupGesture(quiet, false)()).not.toThrow();
    expect(quiet.open).not.toHaveBeenCalled();
    expect(beginGooglePopupGesture(null, true)()).toBeUndefined();
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
    expect(outcome).toEqual({ status: "error", error: closed });
    expect(signInWithRedirect).not.toHaveBeenCalled();
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
