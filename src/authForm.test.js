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
} from "./authForm";
import { PACKAGE_EXPIRY_DAYS, expiryDaysForPack } from "./packageExpiry";

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
});

describe("package expiry defaults", () => {
  it("keeps promo packs shorter than paid packs", () => {
    expect(PACKAGE_EXPIRY_DAYS.promo).toBe(90);
    expect(PACKAGE_EXPIRY_DAYS.paid).toBe(180);
    expect(expiryDaysForPack("promo")).toBeLessThan(expiryDaysForPack("paid"));
  });
});
