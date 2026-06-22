import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnN0Skhq_y2azpES-ccv_yv9voxa2JyXg",
  authDomain: "become-app-dde78.firebaseapp.com",
  projectId: "become-app-dde78",
  storageBucket: "become-app-dde78.firebasestorage.app",
  messagingSenderId: "747108494298",
  appId: "1:747108494298:web:af546e90d9d70294856ee3",
  measurementId: "G-9E4YEKWZD8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); export const db = getFirestore(app);
