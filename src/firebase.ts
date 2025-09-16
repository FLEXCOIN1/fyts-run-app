import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAewJXjvAKoiEX7YRcQ6d6LPBFzd-rTE78",
  authDomain: "fyts-run-tracker.firebaseapp.com",
  projectId: "fyts-run-tracker",
  storageBucket: "fyts-run-tracker.firebasestorage.app",
  messagingSenderId: "757450515664",
  appId: "1:757450515664:web:ec06b813b6f67bdac36ad5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);