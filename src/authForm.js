/** Become does not currently require Firebase email verification after signup. */
export const EMAIL_VERIFICATION_REQUIRED = false;

export const SIGNUP_NEXT_COPY = EMAIL_VERIFICATION_REQUIRED
  ? "After you create your account, check your inbox to verify your email before signing in."
  : "After you create your account, you'll land in Become. Email verification isn't required.";

export function validateSignIn(form) {
  const errors = {};
  const email = (form && form.email ? String(form.email) : "").trim();
  const password = form && form.password != null ? String(form.password) : "";
  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";
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
        : "Email or password is incorrect.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/missing-password":
      return "Password is required.";
    case "auth/missing-email":
      return "Email is required.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Allow pop-ups and try Google again.";
    case "auth/account-exists-with-different-credential":
      return "This email is already used with a different sign-in method.";
    default:
      return (err && err.message) || "Something went wrong. Please try again.";
  }
}
