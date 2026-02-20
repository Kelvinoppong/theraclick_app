/**
 * Chat persistence — mirrors lib/chatStore.ts from the web repo.
 *
 * Two modes:
 *   - Firestore-backed: saves to users/{uid}/aiThreads/default/messages
 *   - Demo mode: AsyncStorage fallback
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";
import type { UserProfile, StoredChatMessage } from "../shared/types";

const LS_PREFIX = "theraclick.aiThread.v1";

function lsKey(uid: string, threadId: string) {
  return `${LS_PREFIX}.${uid}.${threadId}`;
}

export async function ensureDefaultAiThread(profile: UserProfile) {
  const threadId = "default";

  if (firebaseIsReady && db) {
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(
      threadRef,
      { id: threadId, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );
  } else {
    const key = lsKey(profile.uid, threadId);
    const existing = await AsyncStorage.getItem(key);
    if (!existing) await AsyncStorage.setItem(key, JSON.stringify([]));
  }

  return threadId;
}

export async function loadAiThreadMessages(
  profile: UserProfile,
  threadId: string
): Promise<StoredChatMessage[]> {
  if (firebaseIsReady && db) {
    const msgCol = collection(
      db,
      "users",
      profile.uid,
      "aiThreads",
      threadId,
      "messages"
    );
    const q = query(msgCol, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      const ts = data?.createdAt?.toMillis?.() ?? Date.now();
      return {
        id: d.id,
        sender: (data.sender ?? "ai") as "user" | "ai",
        text: (data.text ?? "") as string,
        createdAt: ts,
      };
    });
  }

  try {
    const raw = await AsyncStorage.getItem(lsKey(profile.uid, threadId));
    if (!raw) return [];
    return JSON.parse(raw) as StoredChatMessage[];
  } catch {
    return [];
  }
}

export async function appendAiThreadMessage(
  profile: UserProfile,
  threadId: string,
  message: Omit<StoredChatMessage, "id" | "createdAt">
): Promise<string> {
  if (firebaseIsReady && db) {
    const msgCol = collection(
      db,
      "users",
      profile.uid,
      "aiThreads",
      threadId,
      "messages"
    );
    const res = await addDoc(msgCol, {
      sender: message.sender,
      text: message.text,
      createdAt: serverTimestamp(),
    });
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(threadRef, { updatedAt: serverTimestamp() }, { merge: true });
    return res.id;
  }

  // Demo / offline fallback
  const key = lsKey(profile.uid, threadId);
  const existing = await loadAiThreadMessages(profile, threadId);
  const newMsg: StoredChatMessage = {
    id: `${Date.now()}`,
    sender: message.sender,
    text: message.text,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify([...existing, newMsg]));
  return newMsg.id;
}
