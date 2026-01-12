// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace the values below with your "Web App" config from the Firebase Console:
// Project Settings -> General -> Your Apps -> Firebase SDK snippet -> Config
const firebaseConfig = {
  apiKey: "AIzaSyCSiQIG-P_KOVA8POiADX-3Aq6RMiirGW0",
  authDomain: "salpointe-lens-signing.web.app",
  projectId: "salpointe-lens-signing",
  storageBucket: "salpointe-lens-signing.firebasestorage.app",
  messagingSenderId: "44266083964",
  appId: "1:44266083964:web:a33a49413bf09165a6dbf9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services and export them
export const auth = getAuth(app);
export const db = getFirestore(app);