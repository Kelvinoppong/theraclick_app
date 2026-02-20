/**
 * AuthContext — mirrors context/auth.tsx from the web repo.
 *
 * Supports two modes:
 *   1. Firebase-backed (real auth + Firestore profile)
 *   2. Demo mode (local-only, AsyncStorage session)
 *
 * WHY a context? Every screen needs to know: who is the user,
 * what role do they have, and are they approved? Instead of
 * prop-drilling, we provide it globally.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";

import { auth, db, firebaseIsReady } from "../services/firebase";
import type { UserRole, AccountStatus, UserProfile } from "../shared/types";

// ── Types ────────────────────────────────────────────

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  isFirebaseBacked: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupStudent: (input: {
    fullName: string;
    email: string;
    schoolEmail: string;
    educationLevel: string;
    school: string;
    password: string;
  }) => Promise<void>;
  applyForRole: (input: {
    role: "peer-mentor" | "counselor";
    fullName: string;
    email: string;
    specialization: string;
    about: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Demo-mode helpers ────────────────────────────────

const LS_KEY = "theraclick.session.v1";

type LocalSession = {
  uid: string;
  role: UserRole | null;
  status: AccountStatus;
  fullName: string | null;
  email: string | null;
  anonymousEnabled: boolean;
  anonymousId: string | null;
};

function randomUid() {
  return `local_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function generateAnonymousId() {
  const adj = ["calm", "quiet", "brave", "gentle", "kind", "steady", "soft", "bright"];
  const animals = ["zebra", "gazelle", "lion", "dove", "panda", "otter", "turtle", "falcon"];
  const a = adj[Math.floor(Math.random() * adj.length)]!;
  const b = animals[Math.floor(Math.random() * animals.length)]!;
  const tail = Math.random().toString(36).slice(2, 4);
  return `${a}${b}${tail}`;
}

async function readLocalSession(): Promise<LocalSession> {
  try {
    const raw = await AsyncStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LocalSession;
  } catch {}
  const fresh: LocalSession = {
    uid: randomUid(),
    role: null,
    status: "active",
    fullName: null,
    email: null,
    anonymousEnabled: true,
    anonymousId: generateAnonymousId(),
  };
  await AsyncStorage.setItem(LS_KEY, JSON.stringify(fresh));
  return fresh;
}

async function writeLocalSession(next: LocalSession) {
  await AsyncStorage.setItem(LS_KEY, JSON.stringify(next));
}

// ── Firestore profile helpers ────────────────────────

function firestoreDocToProfile(uid: string, d: any): UserProfile {
  return {
    uid,
    role: (d?.role ?? null) as UserRole | null,
    status: (d?.status ?? "active") as AccountStatus,
    fullName: (d?.fullName ?? null) as string | null,
    email: (d?.email ?? null) as string | null,
    anonymousEnabled: !!d?.anonymousEnabled,
    anonymousId: (d?.anonymousId ?? null) as string | null,
    student: d?.student
      ? {
          schoolEmail: d.student.schoolEmail ?? null,
          educationLevel: d.student.educationLevel ?? null,
          school: d.student.school ?? null,
        }
      : undefined,
    application: d?.application
      ? {
          specialization: d.application.specialization ?? null,
          about: d.application.about ?? null,
        }
      : undefined,
  };
}

async function ensureFirestoreProfile(uid: string): Promise<UserProfile | null> {
  if (!firebaseIsReady || !db) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        createdAt: serverTimestamp(),
        role: null,
        status: "active",
        fullName: null,
        email: null,
        anonymousEnabled: false,
        anonymousId: null,
        student: { schoolEmail: null, educationLevel: null, school: null },
        application: { specialization: null, about: null },
      },
      { merge: true }
    );
  }
  const snap2 = await getDoc(ref);
  return firestoreDocToProfile(uid, snap2.data());
}

// ── Provider ─────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isFirebaseBacked = firebaseIsReady;

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;
    let unsubProfile: Unsubscribe | null = null;

    async function initLocal() {
      const s = await readLocalSession();
      setUser(null);
      setProfile({
        uid: s.uid,
        role: s.role,
        status: s.status,
        fullName: s.fullName,
        email: s.email,
        anonymousEnabled: s.anonymousEnabled,
        anonymousId: s.anonymousId,
      });
      setLoading(false);
    }

    async function initFirebase() {
      if (!auth || !db) return initLocal();

      unsubAuth = onAuthStateChanged(auth, async (u) => {
        try {
          setUser(u);
          if (u) {
            const p = await ensureFirestoreProfile(u.uid);
            if (p) setProfile(p);

            // Real-time listener for profile updates (e.g. admin approvals)
            const profileRef = doc(db!, "users", u.uid);
            unsubProfile = onSnapshot(
              profileRef,
              (snap) => {
                if (snap.exists()) {
                  setProfile(firestoreDocToProfile(u.uid, snap.data()));
                }
              },
              (err) => console.error("Profile listener error:", err)
            );
          } else {
            unsubProfile?.();
            unsubProfile = null;
            setProfile(null);
          }
          setLoading(false);
        } catch (e) {
          console.error("Auth init error:", e);
          await initLocal();
        }
      });
    }

    if (isFirebaseBacked) {
      void initFirebase();
    } else {
      void initLocal();
    }

    return () => {
      unsubAuth?.();
      unsubProfile?.();
    };
  }, [isFirebaseBacked]);

  // ── Auth actions ──

  const loginWithEmail = async (email: string, password: string) => {
    if (!isFirebaseBacked || !auth)
      throw new Error("Firebase is not configured");
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signupStudent = async (input: {
    fullName: string;
    email: string;
    schoolEmail: string;
    educationLevel: string;
    school: string;
    password: string;
  }) => {
    if (!isFirebaseBacked || !auth || !db)
      throw new Error("Firebase is not configured");

    const cred = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password
    );
    await fbUpdateProfile(cred.user, { displayName: input.fullName.trim() });

    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        role: "student",
        status: "active",
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        anonymousEnabled: false,
        anonymousId: null,
        student: {
          schoolEmail: input.schoolEmail.trim(),
          educationLevel: input.educationLevel.trim(),
          school: input.school.trim(),
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const applyForRole = async (input: {
    role: "peer-mentor" | "counselor";
    fullName: string;
    email: string;
    specialization: string;
    about: string;
    password: string;
  }) => {
    if (!isFirebaseBacked || !auth || !db)
      throw new Error("Firebase is not configured");

    const cred = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password
    );
    await fbUpdateProfile(cred.user, { displayName: input.fullName.trim() });

    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        role: input.role,
        status: "pending",
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        anonymousEnabled: false,
        anonymousId: null,
        application: {
          specialization: input.specialization.trim(),
          about: input.about.trim(),
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const logout = async () => {
    try {
      if (isFirebaseBacked && auth) await fbSignOut(auth);
    } finally {
      await AsyncStorage.removeItem(LS_KEY);
      setUser(null);
      setProfile(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      profile,
      isFirebaseBacked,
      loginWithEmail,
      signupStudent,
      applyForRole,
      logout,
    }),
    [loading, user, profile, isFirebaseBacked]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
