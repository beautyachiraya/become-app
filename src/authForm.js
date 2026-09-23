/** Become does not currently require Firebase email verification after signup. */
export const EMAIL_VERIFICATION_REQUIRED = false;

export const SIGNUP_NEXT_COPY = EMAIL_VERIFICATION_REQUIRED
  ? "We'll send a short email to confirm, then you can add your first package."
  : "After you create an account, you'll land in Become and can add your first package.";

export const LANDING_HEADLINE =
  "Track your beauty packages in one place — how many sessions you have left, at which clinic, and when they expire.";

export const LANDING_BULLETS = [
  "Add a package when you buy one",
  "Log each visit and watch the count go down",
  "Buy more when a pack is finished — history stays",
];

export const ACCEPT_BOTH_HINT = "Please accept both to continue";
export const GOOGLE_SIGNUP_HINT =
  "Accept the Privacy Policy and Terms below to sign up with Google.";

/**
 * The accept-both line and the Google hint stay hidden until someone tries
 * to continue without both boxes checked. Once both are accepted, both hints clear.
 */
export function signupAcceptanceHints({ attempted, privacyAccepted, termsAccepted } = {}) {
  if ((privacyAccepted && termsAccepted) || !attempted) {
    return { google: "", acceptBoth: "" };
  }
  if (attempted === "google") {
    return { google: GOOGLE_SIGNUP_HINT, acceptBoth: ACCEPT_BOTH_HINT };
  }
  return { google: "", acceptBoth: ACCEPT_BOTH_HINT };
}

/** Country chosen on signup, plus the local number with its dial code when it isn't already there. */
export function profileFromSignup(form) {
  const name = form && form.name ? String(form.name) : "";
  const email = form && form.email ? String(form.email).trim() : "";
  const local = form && form.phone ? String(form.phone).trim() : "";
  const countryCode = form && form.countryCode ? String(form.countryCode).trim() : "";
  const dialMatch = countryCode.match(/^\+\d+/);
  const dial = dialMatch ? dialMatch[0] : "";
  const compact = local.replace(/\s+/g, "");
  let phone = local;
  if (local && dial && !compact.startsWith(dial)) phone = `${dial} ${local}`;
  const profile = { name, email, phone };
  if (countryCode) profile.countryCode = countryCode;
  return profile;
}

export const EMPTY_SIGNIN_ERROR = "Enter your email and password.";
export const WRONG_CREDENTIALS_ERROR =
  "Email or password doesn't match. Try again or reset your password.";

export function validateSignIn(form) {
  const errors = {};
  const email = (form && form.email ? String(form.email) : "").trim();
  const password = form && form.password != null ? String(form.password) : "";
  if (!email) errors.email = EMPTY_SIGNIN_ERROR;
  if (!password) errors.password = EMPTY_SIGNIN_ERROR;
  return errors;
}

export function validateResetEmail(email) {
  if (!(email || "").trim()) return "Email is required";
  return "";
}

export function mapAuthError(err, context) {
  const code = err && err.code ? String(err.code) : "";
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return context === "reset"
        ? "No account found with that email."
        : WRONG_CREDENTIALS_ERROR;
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return WRONG_CREDENTIALS_ERROR;
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/missing-password":
      return EMPTY_SIGNIN_ERROR;
    case "auth/missing-email":
      return "Email is required.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Allow pop-ups and try Google again.";
    case "auth/unauthorized-domain":
      return "Google sign-in isn't available from this address. Try email and password.";
    case "auth/web-storage-unsupported":
      return "This browser is blocking sign-in storage. Turn off private browsing, or use email and password.";
    case "auth/operation-not-supported-in-this-environment":
      return "Google sign-in isn't supported in this browser. Try Safari or Chrome, or use email and password.";
    case "auth/redirect-cancelled-by-user":
      return "";
    case "auth/missing-google-credential":
      return "Google sign-in couldn't be finished. Please try again.";
    case "auth/account-exists-with-different-credential":
      return "This email is already used with a different sign-in method.";
    default:
      return (err && err.message) || "Something went wrong. Please try again.";
  }
}
