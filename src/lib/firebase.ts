// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDs0q_-lJbt21SazyTX3Dj4R4NXVy2_5Yc",
  authDomain: "gestao-igreja-deus-e-amor.firebaseapp.com",
  projectId: "gestao-igreja-deus-e-amor",
  storageBucket: "gestao-igreja-deus-e-amor.appspot.com",
  messagingSenderId: "1018859862216",
  appId: "1:1018859862216:web:cf53c31ba6408b119e4dfd",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
