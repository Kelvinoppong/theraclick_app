/**
 * callStore — Firestore signaling for WebRTC calls.
 *
 * Firestore structure:
 *   calls/{callId}
 *     callerId, receiverId, type, status, callerName, receiverName, createdAt
 *
 *   calls/{callId}/signals/{signalId}
 *     type: "offer" | "answer" | "ice-candidate"
 *     data: JSON-serialized SDP or ICE candidate
 *     senderId: uid of the sender
 */

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Unsubscribe,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";

export type CallStatus = "ringing" | "active" | "ended" | "missed";
export type CallType = "audio" | "video";

export type CallDoc = {
  id: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  receiverName: string;
  type: CallType;
  status: CallStatus;
  createdAt: number;
};

export type SignalDoc = {
  id: string;
  type: "offer" | "answer" | "ice-candidate";
  data: string;
  senderId: string;
};

/* ─── Create a new call (caller side) ─── */

export async function createCall(
  callerId: string,
  receiverId: string,
  callerName: string,
  receiverName: string,
  type: CallType
): Promise<string> {
  if (!firebaseIsReady || !db) throw new Error("Firebase not ready");

  const ref = await addDoc(collection(db, "calls"), {
    callerId,
    receiverId,
    callerName,
    receiverName,
    type,
    status: "ringing",
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

/* ─── Update call status ─── */

export async function updateCallStatus(
  callId: string,
  status: CallStatus
): Promise<void> {
  if (!firebaseIsReady || !db) return;
  await updateDoc(doc(db, "calls", callId), { status });
}

/* ─── End a call ─── */

export async function endCall(callId: string): Promise<void> {
  await updateCallStatus(callId, "ended");
}

/* ─── Write a signal (offer, answer, or ICE candidate) ─── */

export async function writeSignal(
  callId: string,
  senderId: string,
  type: "offer" | "answer" | "ice-candidate",
  data: string
): Promise<void> {
  if (!firebaseIsReady || !db) return;

  await addDoc(collection(db, "calls", callId, "signals"), {
    type,
    data,
    senderId,
    createdAt: serverTimestamp(),
  });
}

/* ─── Subscribe to call document changes ─── */

export function subscribeToCall(
  callId: string,
  callback: (call: CallDoc | null) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    callback(null);
    return () => {};
  }

  return onSnapshot(doc(db, "calls", callId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as any;
    callback({
      id: snap.id,
      callerId: data.callerId,
      receiverId: data.receiverId,
      callerName: data.callerName || "Unknown",
      receiverName: data.receiverName || "Unknown",
      type: data.type || "audio",
      status: data.status || "ringing",
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    });
  });
}

/* ─── Subscribe to signals (for SDP + ICE exchange) ─── */

export function subscribeToSignals(
  callId: string,
  callback: (signal: SignalDoc) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) return () => {};

  const signalsCol = collection(db, "calls", callId, "signals");

  return onSnapshot(signalsCol, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data() as any;
        callback({
          id: change.doc.id,
          type: data.type,
          data: data.data,
          senderId: data.senderId,
        });
      }
    });
  });
}

/* ─── Listen for incoming calls for a specific user ─── */

export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallDoc) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) return () => {};

  const q = query(
    collection(db, "calls"),
    where("receiverId", "==", userId),
    where("status", "==", "ringing")
  );

  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data() as any;
        callback({
          id: change.doc.id,
          callerId: data.callerId,
          receiverId: data.receiverId,
          callerName: data.callerName || "Unknown",
          receiverName: data.receiverName || "Unknown",
          type: data.type || "audio",
          status: "ringing",
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        });
      }
    });
  });
}
