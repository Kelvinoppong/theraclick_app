/**
 * Chat persistence — multi-thread support (Gemini-style).
 *
 * Firestore structure:
 *   users/{uid}/aiThreads/{threadId}          — thread metadata (title, timestamps)
 *   users/{uid}/aiThreads/{threadId}/messages  — individual messages
 *
 * Offline fallback: AsyncStorage keyed by uid + threadId.
 *
 * Key functions:
 *   createAiThread     — create a new empty thread
 *   listAiThreads      — fetch all threads sorted by updatedAt desc
 *   loadAiThreadMessages — load messages for a thread
 *   appendAiThreadMessage — add a message and update thread metadata
 *   updateThreadTitle   — rename a thread (auto-titled from first user message)
 *   deleteAiThread      — remove a thread and its messages
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";
import type {
  UserProfile,
  StoredChatMessage,
  ChatThread,
} from "../shared/types";

const LS_PREFIX = "theraclick.aiThread.v1";
const THREADS_INDEX_KEY = "theraclick.aiThreadIndex.v1";

function lsKey(uid: string, threadId: string) {
  return `${LS_PREFIX}.${uid}.${threadId}`;
}

function threadIndexKey(uid: string) {
  return `${THREADS_INDEX_KEY}.${uid}`;
}

/* ─── helpers for offline thread index ─── */

async function getLocalThreadIndex(uid: string): Promise<ChatThread[]> {
  try {
    const raw = await AsyncStorage.getItem(threadIndexKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalThreadIndex(uid: string, threads: ChatThread[]) {
  await AsyncStorage.setItem(threadIndexKey(uid), JSON.stringify(threads));
}

/* ─── Create a new thread ─── */

export async function createAiThread(
  profile: UserProfile,
  title = "New chat"
): Promise<string> {
  const now = Date.now();

  if (firebaseIsReady && db) {
    const threadsCol = collection(db, "users", profile.uid, "aiThreads");
    const ref = await addDoc(threadsCol, {
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  // Offline fallback
  const id = `thread_${now}`;
  const thread: ChatThread = { id, title, createdAt: now, updatedAt: now };
  const index = await getLocalThreadIndex(profile.uid);
  index.unshift(thread);
  await saveLocalThreadIndex(profile.uid, index);
  await AsyncStorage.setItem(lsKey(profile.uid, id), JSON.stringify([]));
  return id;
}

/* ─── Legacy: ensure a "default" thread exists (backward compat) ─── */

export async function ensureDefaultAiThread(
  profile: UserProfile
): Promise<string> {
  const threadId = "default";

  if (firebaseIsReady && db) {
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(
      threadRef,
      {
        id: threadId,
        title: "First chat",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    const key = lsKey(profile.uid, threadId);
    const existing = await AsyncStorage.getItem(key);
    if (!existing) {
      await AsyncStorage.setItem(key, JSON.stringify([]));
      const index = await getLocalThreadIndex(profile.uid);
      if (!index.find((t) => t.id === threadId)) {
        const now = Date.now();
        index.push({
          id: threadId,
          title: "First chat",
          createdAt: now,
          updatedAt: now,
        });
        await saveLocalThreadIndex(profile.uid, index);
      }
    }
  }

  return threadId;
}

/* ─── List all threads ─── */

export async function listAiThreads(
  profile: UserProfile
): Promise<ChatThread[]> {
  if (firebaseIsReady && db) {
    const threadsCol = collection(db, "users", profile.uid, "aiThreads");
    const snap = await getDocs(threadsCol);
    const threads: ChatThread[] = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        title: data.title || "Untitled",
        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
      };
    });
    // Sort newest first (client-side to avoid composite index)
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    return threads;
  }

  return getLocalThreadIndex(profile.uid);
}

/* ─── Load messages for a thread ─── */

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

/* ─── Append a message ─── */

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

  // Offline fallback
  const key = lsKey(profile.uid, threadId);
  const existing = await loadAiThreadMessages(profile, threadId);
  const newMsg: StoredChatMessage = {
    id: `${Date.now()}`,
    sender: message.sender,
    text: message.text,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify([...existing, newMsg]));

  // Update index timestamp
  const index = await getLocalThreadIndex(profile.uid);
  const idx = index.findIndex((t) => t.id === threadId);
  if (idx >= 0) {
    index[idx].updatedAt = Date.now();
    await saveLocalThreadIndex(profile.uid, index);
  }

  return newMsg.id;
}

/* ─── Update thread title ─── */

export async function updateThreadTitle(
  profile: UserProfile,
  threadId: string,
  title: string
) {
  if (firebaseIsReady && db) {
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await setDoc(threadRef, { title }, { merge: true });
    return;
  }

  const index = await getLocalThreadIndex(profile.uid);
  const thread = index.find((t) => t.id === threadId);
  if (thread) {
    thread.title = title;
    await saveLocalThreadIndex(profile.uid, index);
  }
}

/* ─── Delete a thread ─── */

export async function deleteAiThread(
  profile: UserProfile,
  threadId: string
) {
  if (firebaseIsReady && db) {
    // Delete all messages in the thread first
    const msgCol = collection(
      db,
      "users",
      profile.uid,
      "aiThreads",
      threadId,
      "messages"
    );
    const snap = await getDocs(msgCol);
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);

    // Delete the thread document
    const threadRef = doc(db, "users", profile.uid, "aiThreads", threadId);
    await deleteDoc(threadRef);
    return;
  }

  // Offline fallback
  await AsyncStorage.removeItem(lsKey(profile.uid, threadId));
  const index = await getLocalThreadIndex(profile.uid);
  const filtered = index.filter((t) => t.id !== threadId);
  await saveLocalThreadIndex(profile.uid, filtered);
}
