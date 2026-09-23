export function formatWriteError(action, error) {
  const detail = (error && error.message) ? error.message : "Please try again.";
  console.error(`[Become] ${action}`, error);
  return `${action}: ${detail}`;
}

function cleanPhotoUrl(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Avatar URL to try next.
 * Stored profile photo first, then the Google sign-in photo, then "" (initials).
 * URLs that already failed to load (img onError) are skipped.
 */
export function resolveProfilePhotoUrl({ profilePhotoURL, authPhotoURL, failedUrls } = {}) {
  const failed = new Set(
    (Array.isArray(failedUrls) ? failedUrls : [])
      .map(cleanPhotoUrl)
      .filter(Boolean)
  );
  const stored = cleanPhotoUrl(profilePhotoURL);
  const authUrl = cleanPhotoUrl(authPhotoURL);
  if (stored && !failed.has(stored)) return stored;
  if (authUrl && !failed.has(authUrl)) return authUrl;
  return "";
}

export const PROFILE_PHOTO_SAVE_ERROR = "Couldn't save your photo. Please try again.";

export const PROFILE_PHOTO_STORAGE_UNAVAILABLE_ERROR =
  "Couldn't save your photo. It wasn't saved because photo storage isn't available. On the Spark plan, uploading again won't store the picture — please try again once storage is available.";

function storageErrorText(error) {
  if (!error || typeof error !== "object") return String(error || "");
  const parts = [error.code, error.message, error.status, error.status_, error.serverResponse];
  const serverResponse = error.customData && error.customData.serverResponse;
  if (serverResponse) parts.push(typeof serverResponse === "string" ? serverResponse : JSON.stringify(serverResponse));
  return parts.filter((part) => part != null && part !== "").join(" ");
}

function isProfileStorageUnavailable(error) {
  const text = storageErrorText(error).toLowerCase();
  if (!text) return false;
  if (text.includes("billing") || text.includes("payment required") || text.includes("spark")) return true;
  if (/storage\/(unknown|unauthorized|quota-exceeded|unauthenticated|bucket-not-found|project-not-found|invalid-default-bucket)/.test(text)) {
    return true;
  }
  return /\b402\b/.test(text) && (text.includes("storage") || text.includes("bucket"));
}

export function formatProfilePhotoSaveError(error) {
  console.error("[Become] Couldn't save your photo", error);
  if (isProfileStorageUnavailable(error)) return PROFILE_PHOTO_STORAGE_UNAVAILABLE_ERROR;
  return PROFILE_PHOTO_SAVE_ERROR;
}

export function createDataClient(api) {
  if (!api || !api.getDoc || !api.getDocs || !api.setDoc || !api.deleteDoc || !api.doc || !api.collection) {
    throw new Error("createDataClient requires Firestore functions");
  }

  let inFlightUid = null;
  let inFlightPromise = null;

  return {
    resetCache() {
      inFlightUid = null;
      inFlightPromise = null;
    },

    loadUserData(uid) {
      if (!uid) return Promise.reject(new Error("Missing user id"));
      if (inFlightUid === uid && inFlightPromise) return inFlightPromise;

      const promise = Promise.all([
        api.getDoc(api.doc(api.db, "users", uid, "profile", "info")),
        api.getDocs(api.collection(api.db, "users", uid, "treatments")),
      ]).then(([profileSnap, treatmentsSnap]) => ({
        profile: profileSnap.exists() ? profileSnap.data() : null,
        treatments: treatmentsSnap.empty ? [] : treatmentsSnap.docs.map((d) => {
          const data = d.data() || {};
          return { ...data, id: data.id != null && data.id !== "" ? data.id : d.id };
        }),
      })).catch((err) => {
        if (inFlightPromise === promise) {
          inFlightUid = null;
          inFlightPromise = null;
        }
        throw err;
      });

      inFlightUid = uid;
      inFlightPromise = promise;
      return promise;
    },

    async writeTreatment(uid, treatment) {
      await api.setDoc(
        api.doc(api.db, "users", uid, "treatments", String(treatment.id)),
        treatment
      );
    },

    async deleteTreatment(uid, id) {
      await api.deleteDoc(api.doc(api.db, "users", uid, "treatments", String(id)));
    },

    async writeProfile(uid, data, options = { merge: true }) {
      await api.setDoc(api.doc(api.db, "users", uid, "profile", "info"), data, options);
    },
  };
}
