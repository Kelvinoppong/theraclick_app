/**
 * Booking persistence — Firestore `bookings` + `users` collections.
 *
 * Schema (matches web firestore.rules):
 *   bookings/{bookingId}
 *     studentId, counselorId, date, time, status, notes, createdAt
 *
 * Counselor availability is read from their profile or a dedicated
 * `availability` subcollection (future). For now we query users
 * with role=counselor and status=active.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Unsubscribe,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";
import type { Booking } from "../shared/types";

const LS_KEY = "theraclick.bookings.v1";

// ── Fetch active counselors ──────────────────────────

export type CounselorInfo = {
  uid: string;
  fullName: string;
  specialization: string;
  slots: string[];
};

const DEFAULT_SLOTS = ["Mon 10:00 AM", "Wed 2:00 PM", "Fri 11:00 AM"];

export async function loadCounselors(): Promise<CounselorInfo[]> {
  if (firebaseIsReady && db) {
    const q = query(
      collection(db, "users"),
      where("role", "==", "counselor"),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        fullName: data.fullName ?? "Counselor",
        specialization: data.application?.specialization ?? "General",
        slots: data.availableSlots ?? DEFAULT_SLOTS,
      };
    });
  }

  // Demo fallback
  return [
    { uid: "demo_c1", fullName: "Dr. Ama Mensah", specialization: "Anxiety & Stress Management", slots: ["Mon 10:00 AM", "Wed 2:00 PM", "Fri 11:00 AM"] },
    { uid: "demo_c2", fullName: "Mr. Kwame Asante", specialization: "Academic Counseling", slots: ["Tue 9:00 AM", "Thu 3:00 PM"] },
    { uid: "demo_c3", fullName: "Ms. Efua Darko", specialization: "Relationships & Self-esteem", slots: ["Mon 1:00 PM", "Wed 4:00 PM", "Fri 9:00 AM"] },
  ];
}

// ── Create booking ───────────────────────────────────

export async function createBooking(booking: {
  studentId: string;
  counselorId: string;
  date: string;
  time: string;
  notes?: string;
}): Promise<string> {
  if (firebaseIsReady && db) {
    const ref = await addDoc(collection(db, "bookings"), {
      ...booking,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  // Demo fallback
  const existing = await loadLocalBookings();
  const newBooking: Booking = {
    id: `local_${Date.now()}`,
    ...booking,
    status: "pending",
    notes: booking.notes,
  };
  await AsyncStorage.setItem(LS_KEY, JSON.stringify([newBooking, ...existing]));
  return newBooking.id;
}

// ── Load student's bookings ──────────────────────────

export async function loadStudentBookings(
  studentId: string
): Promise<Booking[]> {
  if (firebaseIsReady && db) {
    // Single-field where avoids needing a composite index
    const q = query(
      collection(db, "bookings"),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(docToBooking).sort(sortDesc);
  }

  const all = await loadLocalBookings();
  return all.filter((b) => b.studentId === studentId);
}

// ── Subscribe to booking updates ─────────────────────

export function subscribeToStudentBookings(
  studentId: string,
  callback: (bookings: Booking[]) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    loadStudentBookings(studentId).then(callback);
    return () => {};
  }

  // Single-field where — sort client-side to avoid composite index requirement
  const q = query(
    collection(db, "bookings"),
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToBooking).sort(sortDesc));
  });
}

// ── Cancel booking ───────────────────────────────────

export async function cancelBooking(bookingId: string): Promise<void> {
  if (firebaseIsReady && db) {
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "cancelled",
    });
    return;
  }

  const bookings = await loadLocalBookings();
  const updated = bookings.map((b) =>
    b.id === bookingId ? { ...b, status: "cancelled" as const } : b
  );
  await AsyncStorage.setItem(LS_KEY, JSON.stringify(updated));
}

// ── Helpers ──────────────────────────────────────────

function sortDesc(a: Booking, b: Booking): number {
  return (b.date || "").localeCompare(a.date || "");
}

function docToBooking(d: any): Booking {
  const data = d.data();
  return {
    id: d.id,
    studentId: data.studentId ?? "",
    counselorId: data.counselorId ?? "",
    date: data.date ?? "",
    time: data.time ?? "",
    status: data.status ?? "pending",
    notes: data.notes,
  };
}

async function loadLocalBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}
