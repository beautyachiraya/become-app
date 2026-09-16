import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export function formatWriteError(action, error) {
  const detail = (error && error.message) ? error.message : "Please try again.";
  console.error(`[Become] ${action}`, error);
  return `${action}: ${detail}`;
}

export function createDataClient(overrides = {}) {
  const api = {
    db: overrides.db || db,
    getDoc: overrides.getDoc || getDoc,
    getDocs: overrides.getDocs || getDocs,
    setDoc: overrides.setDoc || setDoc,
    deleteDoc: overrides.deleteDoc || deleteDoc,
    doc: overrides.doc || doc,
    collection: overrides.collection || collection,
  };

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
        treatments: treatmentsSnap.empty ? [] : treatmentsSnap.docs.map((d) => d.data()),
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

export const dataClient = createDataClient();
