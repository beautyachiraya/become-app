export function formatWriteError(action, error) {
  const detail = (error && error.message) ? error.message : "Please try again.";
  console.error(`[Become] ${action}`, error);
  return `${action}: ${detail}`;
}

/**
 * Firestore permission-denied, including the "Missing or insufficient permissions" text.
 * Storage errors are a different problem and are not treated as a visit-rules denial.
 */
export function isFirestorePermissionDenied(error) {
  if (!error || typeof error !== "object") {
    const text = String(error || "").toLowerCase();
    return text.includes("permission-denied") || text.includes("insufficient permissions");
  }
  const code = String(error.code || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  if (code.includes("storage/")) return false;
  if (code === "permission-denied" || code.endsWith("/permission-denied")) return true;
  if (message.includes("missing or insufficient permissions")) return true;
  if (message.includes("permission-denied")) return true;
  return false;
}

/**
 * Plan / update / cancel / load for users/{uid}/visits.
 * A rules denial gets plain language. Other failures keep the usual action plus detail.
 */
export function formatVisitWriteError(action, error) {
  console.error(`[Become] ${action}`, error);
  if (isFirestorePermissionDenied(error)) {
    return `${action}. This account isn't allowed to store visits yet.`;
  }
  const detail = (error && error.message) ? error.message : "Please try again.";
  return `${action}: ${detail}`;
}

function cleanPhotoUrl(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** A FileReader data URL or blob URL is only a local preview, never a saved photo. */
export function isLocalPhotoPreview(value) {
  const url = cleanPhotoUrl(value).toLowerCase();
  return url.startsWith("blob:") || url.startsWith("data:");
}

function usablePhotoUrl(value, failed) {
  const url = cleanPhotoUrl(value);
  if (!url || failed.has(url) || isLocalPhotoPreview(url)) return "";
  return url;
}

/**
 * Avatar URL to try next.
 * Stored profile photo first, then the sign-in photo, then "" (initials).
 * Local previews and URLs that already failed to load are skipped.
 */
export function resolveProfilePhotoUrl({ profilePhotoURL, authPhotoURL, failedUrls } = {}) {
  const failed = new Set(
    (Array.isArray(failedUrls) ? failedUrls : [])
      .map(cleanPhotoUrl)
      .filter(Boolean)
  );
  return usablePhotoUrl(profilePhotoURL, failed) || usablePhotoUrl(authPhotoURL, failed) || "";
}

export const PROFILE_PHOTO_SAVE_ERROR = "Couldn't save your photo. Please try again.";

export const PROFILE_PHOTO_QUOTA_ERROR =
  "Couldn't save your photo. The free storage limit has been reached, so this picture wasn't saved. Try again later, or free up some space.";

export const PROFILE_PHOTO_STORAGE_UNAVAILABLE_ERROR =
  "Couldn't save your photo. It wasn't saved because photo storage isn't available. On the Spark plan, uploading again won't store the picture — please try again once storage is available.";

function storageErrorText(error) {
  if (!error || typeof error !== "object") return String(error || "");
  const parts = [error.code, error.message, error.status, error.status_, error.serverResponse];
  const serverResponse = error.customData && error.customData.serverResponse;
  if (serverResponse) parts.push(typeof serverResponse === "string" ? serverResponse : JSON.stringify(serverResponse));
  return parts.filter((part) => part != null && part !== "").join(" ");
}

function isStorageQuotaExceeded(error) {
  const text = storageErrorText(error).toLowerCase();
  if (!text) return false;
  if (text.includes("storage/quota-exceeded") || text.includes("quota exceeded")) return true;
  return text.includes("quota") && text.includes("bucket");
}

function isProfileStorageUnavailable(error) {
  const text = storageErrorText(error).toLowerCase();
  if (!text) return false;
  if (text.includes("billing") || text.includes("payment required") || text.includes("spark")) return true;
  if (/storage\/(unknown|unauthorized|unauthenticated|bucket-not-found|project-not-found|invalid-default-bucket)/.test(text)) {
    return true;
  }
  return /\b402\b/.test(text) && (text.includes("storage") || text.includes("bucket"));
}

export function formatProfilePhotoSaveError(error) {
  console.error("[Become] Couldn't save your photo", error);
  if (isStorageQuotaExceeded(error)) return PROFILE_PHOTO_QUOTA_ERROR;
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

    async loadVisits(uid) {
      if (!uid) return Promise.reject(new Error("Missing user id"));
      const snap = await api.getDocs(api.collection(api.db, "users", uid, "visits"));
      if (!snap || snap.empty) return [];
      return snap.docs.map((d) => {
        const data = (d.data && d.data()) || {};
        return { ...data, id: data.id != null && data.id !== "" ? data.id : d.id };
      });
    },

    async writeVisit(uid, visit) {
      const payload = {};
      Object.keys(visit || {}).forEach((key) => {
        if (visit[key] !== undefined) payload[key] = visit[key];
      });
      await api.setDoc(
        api.doc(api.db, "users", uid, "visits", String(visit.id)),
        payload
      );
    },
  };
}
