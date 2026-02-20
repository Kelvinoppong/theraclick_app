/**
 * Firebase client initialization for React Native.
 *
 * Mirrors lib/firebase.ts from the web app but uses
 * plain env constants instead of NEXT_PUBLIC_ prefixes.
 *
 * Falls back to "demo" values so the app can run without
 * Firebase configured (same pattern as web).
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "demo",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "demo",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "demo",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "demo",
};

export const firebaseIsDemo = Object.values(firebaseConfig).some(
  (v) => v === "demo"
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // React Native needs explicit persistence via AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, auth, db };
export const firebaseIsReady = !!auth && !!db && !firebaseIsDemo;
