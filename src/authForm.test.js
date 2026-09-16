import {
  validateSignIn,
  validateResetEmail,
  mapAuthError,
  EMAIL_VERIFICATION_REQUIRED,
  SIGNUP_NEXT_COPY,
} from "./authForm";
import { PACKAGE_EXPIRY_DAYS, expiryDaysForPack } from "./packageExpiry";

describe("validateSignIn", () => {
  it("requires email and password on empty submit", () => {
    expect(validateSignIn({ email: "", password: "" })).toEqual({
      email: "Email is required",
      password: "Password is required",
    });
  });

  it("trims email and ignores filled fields", () => {
    expect(validateSignIn({ email: "  a@b.com  ", password: "secret" })).toEqual({});
  });

  it("flags only the missing field", () => {
    expect(validateSignIn({ email: "a@b.com", password: "" })).toEqual({
      password: "Password is required",
    });
    expect(validateSignIn({ email: "   ", password: "x" })).toEqual({
      email: "Email is required",
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
  it("maps wrong credentials to a clear sign-in message", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe(
      "Email or password is incorrect."
    );
    expect(mapAuthError({ code: "auth/wrong-password" })).toBe(
      "Email or password is incorrect."
    );
    expect(mapAuthError({ code: "auth/user-not-found" })).toBe(
      "Email or password is incorrect."
    );
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
    expect(SIGNUP_NEXT_COPY.toLowerCase()).toContain("land in become");
    expect(SIGNUP_NEXT_COPY.toLowerCase()).toMatch(/isn.t required/);
  });
});

describe("package expiry defaults", () => {
  it("keeps promo packs shorter than paid packs", () => {
    expect(PACKAGE_EXPIRY_DAYS.promo).toBe(90);
    expect(PACKAGE_EXPIRY_DAYS.paid).toBe(180);
    expect(expiryDaysForPack("promo")).toBeLessThan(expiryDaysForPack("paid"));
  });
});
