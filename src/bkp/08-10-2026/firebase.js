// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAk5fc_KBjXNXNQVjpCJmPmhyWkmjn2q1s",
  authDomain: "healthybitehub-app.firebaseapp.com",
  projectId: "healthybitehub-app",
  storageBucket: "healthybitehub-app.firebasestorage.app",
  messagingSenderId: "168127888521",
  appId: "1:168127888521:web:d32ca57a8975be71185a58"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();