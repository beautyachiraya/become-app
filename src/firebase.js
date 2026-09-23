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
export const auth = getAuth(app); export const db = getFirestore(app); export const storage = getStorage(app);

// Mobile Google redirect uses the live host as authDomain so the /__/auth helper
// is same-origin (vercel.json proxies it). Email/password and desktop popup stay on `auth`.
const pageHost = typeof window !== "undefined" && window.location ? window.location.hostname : "";
const redirectDomain = resolveAuthDomain(pageHost);
export const googleRedirectAuth = redirectDomain === FIREBASE_AUTH_DOMAIN
  ? auth
  : getAuth(initializeApp({ ...firebaseConfig, authDomain: redirectDomain }, "google-redirect"));
