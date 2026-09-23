import {
  validateSignIn,
  validateResetEmail,
  mapAuthError,
  EMAIL_VERIFICATION_REQUIRED,
  SIGNUP_NEXT_COPY,
  EMPTY_SIGNIN_ERROR,
  WRONG_CREDENTIALS_ERROR,
  LANDING_HEADLINE,
  LANDING_BULLETS,
  signupAcceptanceHints,
  profileFromSignup,
  ACCEPT_BOTH_HINT,
  GOOGLE_SIGNUP_HINT,
} from "./authForm";
import { PACKAGE_EXPIRY_DAYS, expiryDaysForPack } from "./packageExpiry";
import { messageChannelForProfile } from "./visits";

describe("validateSignIn", () => {
  it("requires email and password on empty submit", () => {
    expect(validateSignIn({ email: "", password: "" })).toEqual({
      email: EMPTY_SIGNIN_ERROR,
      password: EMPTY_SIGNIN_ERROR,
    });
  });

  it("trims email and ignores filled fields", () => {
    expect(validateSignIn({ email: "  a@b.com  ", password: "secret" })).toEqual({});
  });

  it("flags only the missing field", () => {
    expect(validateSignIn({ email: "a@b.com", password: "" })).toEqual({
      password: EMPTY_SIGNIN_ERROR,
    });
    expect(validateSignIn({ email: "   ", password: "x" })).toEqual({
      email: EMPTY_SIGNIN_ERROR,
    });
  });
});

describe("validateResetEmail", () => {
  it("requires an email", () => {
    expect(validateResetEmail("")).toBe("Email is required");
    expect(validateResetEmail("  ")).toBe("Email is required");
  });

  it("accepts a non-empty email", () => {
    expect(validateResetEmail("you@example.com")).toBe("");
  });
});

describe("mapAuthError", () => {
  it("maps wrong credentials to the product sign-in message", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe(WRONG_CREDENTIALS_ERROR);
    expect(mapAuthError({ code: "auth/wrong-password" })).toBe(WRONG_CREDENTIALS_ERROR);
    expect(mapAuthError({ code: "auth/user-not-found" })).toBe(WRONG_CREDENTIALS_ERROR);
  });

  it("maps reset user-not-found separately", () => {
    expect(mapAuthError({ code: "auth/user-not-found" }, "reset")).toBe(
      "No account found with that email."
    );
  });

  it("does not surface a cancelled Google popup as an error", () => {
    expect(mapAuthError({ code: "auth/popup-closed-by-user" })).toBe("");
    expect(mapAuthError({ code: "auth/redirect-cancelled-by-user" })).toBe("");
  });

  it("explains Google redirect failures", () => {
    expect(mapAuthError({ code: "auth/unauthorized-domain" }, "google")).toBe(
      "Google sign-in isn't available from this address. Try email and password."
    );
    expect(mapAuthError({ code: "auth/web-storage-unsupported" }, "google")).toContain(
      "private browsing"
    );
    expect(mapAuthError({ code: "auth/operation-not-supported-in-this-environment" }, "google")).toContain(
      "isn't supported"
    );
    expect(mapAuthError({ code: "auth/missing-google-credential" }, "google")).toBe(
      "Google sign-in couldn't be finished. Please try again."
    );
  });

  it("falls back to a generic message", () => {
    expect(mapAuthError({})).toBe("Something went wrong. Please try again.");
  });
});

describe("signup next-step copy", () => {
  it("does not claim email verification unless it is required", () => {
    expect(EMAIL_VERIFICATION_REQUIRED).toBe(false);
    expect(SIGNUP_NEXT_COPY).toBe(
      "After you create an account, you'll land in Become and can add your first package."
    );
  });
});

describe("landing copy", () => {
  it("explains packages, sessions, clinic, and expiry", () => {
    expect(LANDING_HEADLINE.toLowerCase()).toContain("packages");
    expect(LANDING_HEADLINE.toLowerCase()).toContain("sessions");
    expect(LANDING_HEADLINE.toLowerCase()).toContain("clinic");
    expect(LANDING_HEADLINE.toLowerCase()).toContain("expire");
    expect(LANDING_BULLETS).toHaveLength(3);
  });

  it("describes adding a package without a promo or paid choice", () => {
    const doorstep = [LANDING_HEADLINE, SIGNUP_NEXT_COPY, ...LANDING_BULLETS].join("\n");
    expect(LANDING_BULLETS[0]).toBe("Add a package when you buy one");
    expect(doorstep.toLowerCase()).not.toContain("promo");
    expect(doorstep.toLowerCase()).not.toContain("paid");
  });
});

describe("signup acceptance hints", () => {
  it("stays quiet until someone tries to continue", () => {
    expect(signupAcceptanceHints({ privacyAccepted: false, termsAccepted: false })).toEqual({
      google: "",
      acceptBoth: "",
    });
  });

  it("asks to accept both only after Sign Up is tapped", () => {
    expect(signupAcceptanceHints({
      attempted: "signup",
      privacyAccepted: false,
      termsAccepted: true,
    })).toEqual({ google: "", acceptBoth: ACCEPT_BOTH_HINT });
  });

  it("explains Google signup when that button is tapped first", () => {
    expect(signupAcceptanceHints({
      attempted: "google",
      privacyAccepted: false,
      termsAccepted: false,
    })).toEqual({ google: GOOGLE_SIGNUP_HINT, acceptBoth: ACCEPT_BOTH_HINT });
  });

  it("clears both hints once privacy and terms are accepted", () => {
    expect(signupAcceptanceHints({
      attempted: "google",
      privacyAccepted: true,
      termsAccepted: true,
    })).toEqual({ google: "", acceptBoth: "" });
  });
});

describe("profileFromSignup", () => {
  it("keeps the chosen country and prefixes the local number", () => {
    expect(profileFromSignup({
      name: "Sophia",
      email: " sophia@email.com ",
      phone: "89 123 4567",
      countryCode: "+66 TH",
    })).toEqual({
      name: "Sophia",
      email: "sophia@email.com",
      phone: "+66 89 123 4567",
      countryCode: "+66 TH",
    });
  });

  it("does not add the dial code twice, and still stores a UAE country with no number", () => {
    expect(profileFromSignup({
      name: "Noura",
      email: "noura@email.com",
      phone: "+971 50 123 4567",
      countryCode: "+971 AE",
    }).phone).toBe("+971 50 123 4567");
    expect(profileFromSignup({
      name: "Noura",
      email: "noura@email.com",
      phone: "",
      countryCode: "+971 AE",
    })).toEqual({
      name: "Noura",
      email: "noura@email.com",
      phone: "",
      countryCode: "+971 AE",
    });
  });

  it("lets a saved UAE country choose WhatsApp even when currency is still THB", () => {
    const profile = profileFromSignup({
      name: "Noura",
      email: "noura@email.com",
      phone: "50 123 4567",
      countryCode: "+971 AE",
    });
    expect(messageChannelForProfile(profile, "THB — Thai Baht ฿").channel).toBe("whatsapp");
  });
});

describe("package expiry defaults", () => {
  it("keeps promo packs shorter than paid packs", () => {
    expect(PACKAGE_EXPIRY_DAYS.promo).toBe(90);
    expect(PACKAGE_EXPIRY_DAYS.paid).toBe(180);
    expect(expiryDaysForPack("promo")).toBeLessThan(expiryDaysForPack("paid"));
  });
});
