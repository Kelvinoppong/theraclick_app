/**
 * Booking flow — zero-cost Firestore implementation.
 *
 * Slot format: "YYYY-MM-DD|HH:mm A" (e.g. "2026-02-25|10:00 AM")
 * Stored in users/{counselorId}.availableSlots[]
 *
 * Flow:
 *   1. Counselor adds slots via CounselorAvailabilityScreen
 *   2. Student browses counselors → picks a slot → creates booking (pending)
 *   3. Counselor sees pending booking → confirms or rejects
 *   4. On confirm: status=confirmed, slot removed, DM thread auto-created
 *   5. Both sides get notifications
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Unsubscribe,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";
import { findOrCreateDmThread, sendDirectMessage } from "./messagingStore";
import { sendImmediateNotification } from "./notifications";
import { addNotification } from "./notificationStore";
import type { Booking } from "../shared/types";

const LS_KEY = "theraclick.bookings.v1";

/* ═══════════════════════════════════════════════════════
   COUNSELOR AVAILABILITY
   ═══════════════════════════════════════════════════════ */

export async function addAvailabilitySlot(
  counselorId: string,
  date: string,
  time: string
): Promise<void> {
  const slot = `${date}|${time}`;
  if (firebaseIsReady && db) {
    await updateDoc(doc(db, "users", counselorId), {
      availableSlots: arrayUnion(slot),
    });
    return;
  }
}

export async function removeAvailabilitySlot(
  counselorId: string,
  date: string,
  time: string
): Promise<void> {
  const slot = `${date}|${time}`;
  if (firebaseIsReady && db) {
    await updateDoc(doc(db, "users", counselorId), {
      availableSlots: arrayRemove(slot),
    });
    return;
  }
}

export async function getAvailabilitySlots(
  counselorId: string
): Promise<{ date: string; time: string }[]> {
  if (firebaseIsReady && db) {
    const snap = await getDoc(doc(db, "users", counselorId));
    const data = snap.data();
    const raw: string[] = data?.availableSlots ?? [];
    const seen = new Set<string>();
    return raw
      .filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      })
      .map((s) => {
        const [date, time] = s.split("|");
        return { date, time };
      })
      .filter((s) => s.date && s.time)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }
  return [];
}

/* ═══════════════════════════════════════════════════════
   COUNSELOR LIST (for students browsing)
   ═══════════════════════════════════════════════════════ */

export type CounselorSlot = { date: string; time: string };

export type CounselorInfo = {
  uid: string;
  fullName: string;
  specialization: string;
  slots: CounselorSlot[];
};

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
      const raw: string[] = data.availableSlots ?? [];
      const slots = raw
        .map((s) => {
          const [date, time] = s.split("|");
          return { date, time };
        })
        .filter((s) => s.date && s.time)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

      return {
        uid: d.id,
        fullName: data.fullName ?? "Counselor",
        specialization: data.application?.specialization ?? "General",
        slots,
      };
    });
  }

  // Demo fallback
  return [
    {
      uid: "demo_c1",
      fullName: "Dr. Ama Mensah",
      specialization: "Anxiety & Stress",
      slots: [
        { date: "2026-02-23", time: "10:00 AM" },
        { date: "2026-02-25", time: "2:00 PM" },
      ],
    },
  ];
}

/* ═══════════════════════════════════════════════════════
   BOOKING CRUD
   ═══════════════════════════════════════════════════════ */

export async function createBooking(booking: {
  studentId: string;
  counselorId: string;
  studentName?: string;
  counselorName?: string;
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

  const existing = await loadLocalBookings();
  const newBooking: Booking = {
    id: `local_${Date.now()}`,
    ...booking,
    status: "pending",
  };
  await AsyncStorage.setItem(LS_KEY, JSON.stringify([newBooking, ...existing]));
  return newBooking.id;
}

/**
 * Counselor confirms a booking:
 *   1. Update status → confirmed
 *   2. Remove the slot from counselor's availability
 *   3. Auto-create a DM thread + send a system message
 *   4. Send notifications to the student
 */
export async function confirmBooking(
  bookingId: string,
  booking: Booking
): Promise<void> {
  if (!firebaseIsReady || !db) return;

  // 1. Update booking status
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, { status: "confirmed" });

  // 2. Remove slot from counselor's availability
  const slot = `${booking.date}|${booking.time}`;
  await updateDoc(doc(db, "users", booking.counselorId), {
    availableSlots: arrayRemove(slot),
  });

  // 3. Auto-create DM thread + system message
  const dmThreadId = await findOrCreateDmThread(
    booking.counselorId,
    booking.studentId
  );
  await updateDoc(bookingRef, { dmThreadId });
  await sendDirectMessage(
    dmThreadId,
    booking.counselorId,
    `📅 Session confirmed for ${booking.date} at ${booking.time}. Looking forward to our conversation!`
  );

  // 4. Notifications
  const title = "Session Confirmed ✓";
  const body = `${booking.counselorName || "Your counselor"} confirmed your session on ${booking.date} at ${booking.time}.`;
  sendImmediateNotification(title, body);
  addNotification({
    type: "booking_confirmed",
    title,
    body,
    screen: "Booking",
  });
}

/**
 * Counselor rejects a booking — status → cancelled.
 */
export async function rejectBooking(bookingId: string): Promise<void> {
  if (!firebaseIsReady || !db) return;
  await updateDoc(doc(db, "bookings", bookingId), { status: "cancelled" });
}

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

export async function completeBooking(bookingId: string): Promise<void> {
  if (firebaseIsReady && db) {
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "completed",
    });
    return;
  }

  const bookings = await loadLocalBookings();
  const updated = bookings.map((b) =>
    b.id === bookingId ? { ...b, status: "completed" as const } : b
  );
  await AsyncStorage.setItem(LS_KEY, JSON.stringify(updated));
}

/**
 * Parse "YYYY-MM-DD" + "HH:mm AM/PM" into a Date object.
 * Returns null if parsing fails.
 */
export function parseBookingDateTime(date: string, time: string): Date | null {
  try {
    const [year, month, day] = date.split("-").map(Number);
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════
   LOADING & SUBSCRIPTIONS
   ═══════════════════════════════════════════════════════ */

export async function loadStudentBookings(
  studentId: string
): Promise<Booking[]> {
  if (firebaseIsReady && db) {
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

export function subscribeToStudentBookings(
  studentId: string,
  callback: (bookings: Booking[]) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    loadStudentBookings(studentId).then(callback);
    return () => {};
  }

  const q = query(
    collection(db, "bookings"),
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToBooking).sort(sortDesc));
  });
}

export function subscribeToCounselorBookings(
  counselorId: string,
  callback: (bookings: Booking[]) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "bookings"),
    where("counselorId", "==", counselorId)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToBooking).sort(sortDesc));
  });
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function sortDesc(a: Booking, b: Booking): number {
  return (b.date || "").localeCompare(a.date || "");
}

function docToBooking(d: any): Booking {
  const data = d.data();
  return {
    id: d.id,
    studentId: data.studentId ?? "",
    counselorId: data.counselorId ?? "",
    studentName: data.studentName,
    counselorName: data.counselorName,
    date: data.date ?? "",
    time: data.time ?? "",
    status: data.status ?? "pending",
    notes: data.notes,
    dmThreadId: data.dmThreadId,
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
