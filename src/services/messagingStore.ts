/**
 * Direct messaging — Firestore `directMessages` collection.
 *
 * Schema (matches web firestore.rules):
 *   directMessages/{chatId}
 *     participants: [uid1, uid2], createdAt, lastMessage, lastMessageAt
 *
 *   directMessages/{chatId}/messages/{messageId}
 *     senderId, text, createdAt
 *
 * Security: rules enforce that only participants can read/write.
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  Unsubscribe,
  limit,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";

export type DirectChat = {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: number;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
};

// ── Find or create a DM thread ───────────────────────

export async function findOrCreateDmThread(
  myUid: string,
  otherUid: string
): Promise<string> {
  if (!firebaseIsReady || !db) return `demo_${myUid}_${otherUid}`;

  // Check if thread already exists
  const q = query(
    collection(db, "directMessages"),
    where("participants", "array-contains", myUid)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const participants = d.data().participants as string[];
    return participants.includes(otherUid);
  });

  if (existing) return existing.id;

  // Create new thread
  const ref = await addDoc(collection(db, "directMessages"), {
    participants: [myUid, otherUid],
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Load user's DM threads ───────────────────────────

export function subscribeToDmThreads(
  uid: string,
  callback: (chats: DirectChat[]) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    callback([]);
    return () => {};
  }

  // Single-field where avoids composite index requirement; sort client-side
  const q = query(
    collection(db, "directMessages"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        participants: data.participants ?? [],
        lastMessage: data.lastMessage ?? "",
        lastMessageAt: data.lastMessageAt?.toMillis?.() ?? Date.now(),
      };
    });
    chats.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    callback(chats);
  });
}

// ── Messages in a thread ─────────────────────────────

export function subscribeToDmMessages(
  chatId: string,
  callback: (messages: DirectMessage[]) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "directMessages", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId ?? "",
          text: data.text ?? "",
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        };
      })
    );
  });
}

// ── Send a message ───────────────────────────────────

export async function sendDirectMessage(
  chatId: string,
  senderId: string,
  text: string
): Promise<void> {
  if (!firebaseIsReady || !db) return;

  await addDoc(collection(db, "directMessages", chatId, "messages"), {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });

  // Update thread metadata
  await setDoc(
    doc(db, "directMessages", chatId),
    {
      lastMessage: text.slice(0, 100),
      lastMessageAt: serverTimestamp(),
    },
    { merge: true }
  );
}
