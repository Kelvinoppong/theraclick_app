/**
 * adminStore — Firestore queries for the admin dashboard.
 *
 * Reads directly from the 'users' collection to provide:
 *   - Platform stats (total users by role, pending count)
 *   - Full user list with filtering
 *   - User status management (activate, disable)
 *
 * These queries require Firestore security rules that allow
 * admin-role users to read the entire 'users' collection.
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";
import type { UserRole, AccountStatus } from "../shared/types";

export type AdminUser = {
  uid: string;
  fullName: string | null;
  email: string | null;
  role: UserRole | null;
  status: AccountStatus;
  anonymousId: string | null;
  school: string | null;
  specialization: string | null;
  createdAt?: number;
};

export type PlatformStats = {
  totalUsers: number;
  students: number;
  counselors: number;
  peerMentors: number;
  admins: number;
  pending: number;
  active: number;
  disabled: number;
};

/* ─── Fetch all users ─── */

export async function fetchAllUsers(): Promise<AdminUser[]> {
  if (!firebaseIsReady || !db) return [];

  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      uid: d.id,
      fullName: data.fullName || null,
      email: data.email || null,
      role: data.role || null,
      status: data.status || "active",
      anonymousId: data.anonymousId || null,
      school: data.student?.school || null,
      specialization: data.application?.specialization || null,
      createdAt: data.createdAt?.toMillis?.() ?? undefined,
    };
  });
}

/* ─── Fetch only pending users ─── */

export async function fetchPendingUsersFromFirestore(): Promise<AdminUser[]> {
  if (!firebaseIsReady || !db) return [];

  const usersCol = collection(db, "users");
  const q = query(usersCol, where("status", "==", "pending"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      uid: d.id,
      fullName: data.fullName || null,
      email: data.email || null,
      role: data.role || null,
      status: "pending" as AccountStatus,
      anonymousId: data.anonymousId || null,
      school: data.student?.school || null,
      specialization: data.application?.specialization || null,
    };
  });
}

/* ─── Compute platform stats from a user list ─── */

export function computeStats(users: AdminUser[]): PlatformStats {
  return {
    totalUsers: users.length,
    students: users.filter((u) => u.role === "student").length,
    counselors: users.filter((u) => u.role === "counselor").length,
    peerMentors: users.filter((u) => u.role === "peer-mentor").length,
    admins: users.filter((u) => u.role === "admin").length,
    pending: users.filter((u) => u.status === "pending").length,
    active: users.filter((u) => u.status === "active").length,
    disabled: users.filter((u) => u.status === "disabled").length,
  };
}

/* ─── Update a user's status ─── */

export async function updateUserStatus(
  uid: string,
  status: AccountStatus
): Promise<void> {
  if (!firebaseIsReady || !db) return;
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { status });
}

/* ─── Update a user's role ─── */

export async function updateUserRole(
  uid: string,
  role: UserRole
): Promise<void> {
  if (!firebaseIsReady || !db) return;
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { role });
}
