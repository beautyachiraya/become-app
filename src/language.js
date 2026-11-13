/** Doorstep and Profile share these two labels. Stored on the device and on the profile. */
export const LANGUAGE_EN = "English";
export const LANGUAGE_TH = "Thai — ภาษาไทย";
export const LANGUAGE_STORAGE_KEY = "become.language";

export function normalizeLanguage(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text === LANGUAGE_TH || text === "th" || text === "Thai" || text.includes("ไทย")) return LANGUAGE_TH;
  if (text === LANGUAGE_EN || text === "en" || text === "English") return LANGUAGE_EN;
  return "";
}

export function localeFromLanguage(language) {
  return normalizeLanguage(language) === LANGUAGE_TH ? "th" : "en";
}

export function readStoredLanguage(storage) {
  try {
    const raw = storage && storage.getItem ? storage.getItem(LANGUAGE_STORAGE_KEY) : "";
    return normalizeLanguage(raw) || LANGUAGE_EN;
  } catch (err) {
    return LANGUAGE_EN;
  }
}

export function writeStoredLanguage(storage, language) {
  const next = normalizeLanguage(language) || LANGUAGE_EN;
  try {
    if (storage && storage.setItem) storage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch (err) {
    /* private mode can block storage; the in-memory choice still applies */
  }
  return next;
}

/** Profile field wins when it is a known language. Missing field means "not saved yet". */
export function languageFromProfile(profile) {
  if (!profile || typeof profile !== "object") return "";
  return normalizeLanguage(profile.language || profile.lang || "");
}
