import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; import { getFirestore } from "firebase/firestore"; import { getStorage } from "firebase/storage";
import { FIREBASE_AUTH_DOMAIN, resolveAuthDomain } from "./googleAuth";

const firebaseConfig = {
  apiKey: "AIzaSyBnN0Skhq_y2azpES-ccv_yv9voxa2JyXg",
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: "become-app-dde78",
  storageBucket: "become-app-dde78.firebasestorage.app",
  messagingSenderId: "747108494298",
  appId: "1:747108494298:web:af546e90d9d70294856ee3",
  measurementId: "G-9E4YEKWZD8"
};

const app = initializeApp(firebaseConfig);
export const firebaseApiKey = firebaseConfig.apiKey;
export const auth = getAuth(app); export const db = getFirestore(app); export const storage = getStorage(app);

// Google redirect uses the Firebase auth domain on every host, including the live
// site, so this is the same Auth instance as email/password and the desktop popup.
const redirectDomain = resolveAuthDomain(
  typeof window !== "undefined" && window.location ? window.location.hostname : ""
);
export const googleRedirectAuth = redirectDomain === FIREBASE_AUTH_DOMAIN
  ? auth
  : getAuth(initializeApp({ ...firebaseConfig, authDomain: redirectDomain }, "google-redirect"));
