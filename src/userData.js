export function formatWriteError(action, error) {
  const detail = (error && error.message) ? error.message : "Please try again.";
  console.error(`[Become] ${action}`, error);
  return `${action}: ${detail}`;
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

      const emptyList = { empty: true, docs: [] };
      const listOrEmpty = (promise) => promise.catch(() => emptyList);
      const mapDocs = (snap) => {
        if (!snap || snap.empty) return [];
        return snap.docs.map((d) => {
          const data = d.data ? d.data() : {};
          return data && data.id != null ? data : { id: d.id, ...data };
        });
      };

      const promise = Promise.all([
        api.getDoc(api.doc(api.db, "users", uid, "profile", "info")),
        api.getDocs(api.collection(api.db, "users", uid, "treatments")),
        listOrEmpty(api.getDocs(api.collection(api.db, "users", uid, "packages"))),
        listOrEmpty(api.getDocs(api.collection(api.db, "users", uid, "sessions"))),
      ]).then(([profileSnap, treatmentsSnap, packagesSnap, sessionsSnap]) => ({
        profile: profileSnap.exists() ? profileSnap.data() : null,
        treatments: treatmentsSnap.empty ? [] : treatmentsSnap.docs.map((d) => d.data()),
        packages: mapDocs(packagesSnap),
        sessions: mapDocs(sessionsSnap),
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

    async writeSession(uid, session) {
      await api.setDoc(
        api.doc(api.db, "users", uid, "sessions", String(session.id)),
        session
      );
    },
  };
}
