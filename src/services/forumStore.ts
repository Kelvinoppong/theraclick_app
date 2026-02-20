/**
 * Forum persistence — CRUD operations against the Firestore `forums` collection.
 *
 * Schema (matches web firestore.rules):
 *   forums/{postId}
 *     authorId, anonymousName, content, category, createdAt, flagged
 *
 *   forums/{postId}/messages/{messageId}/replies/{replyId}
 *     (phase 2 replies — prepared but not wired yet)
 *
 * Falls back to AsyncStorage when Firebase is not configured.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Unsubscribe,
  limit,
  QueryConstraint,
} from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";
import type { ForumPost } from "../shared/types";

const LS_KEY = "theraclick.forums.v1";

// ── Create ───────────────────────────────────────────

export async function createForumPost(post: {
  authorId: string;
  anonymousName: string;
  content: string;
  category: string;
}): Promise<string> {
  if (firebaseIsReady && db) {
    const ref = await addDoc(collection(db, "forums"), {
      ...post,
      createdAt: serverTimestamp(),
      flagged: false,
    });
    return ref.id;
  }

  // Demo fallback
  const existing = await loadLocalPosts();
  const newPost: ForumPost = {
    id: `local_${Date.now()}`,
    ...post,
    createdAt: Date.now(),
    flagged: false,
  };
  await AsyncStorage.setItem(LS_KEY, JSON.stringify([newPost, ...existing]));
  return newPost.id;
}

// ── Read (one-time) ──────────────────────────────────

export async function loadForumPosts(
  category?: string
): Promise<ForumPost[]> {
  if (firebaseIsReady && db) {
    const col = collection(db, "forums");
    // When filtering by category, skip orderBy to avoid composite index requirement
    const constraints: QueryConstraint[] = category
      ? [where("category", "==", category), limit(50)]
      : [orderBy("createdAt", "desc"), limit(50)];
    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const posts = snap.docs.map(docToPost);
    if (category) posts.sort((a, b) => b.createdAt - a.createdAt);
    return posts;
  }

  const posts = await loadLocalPosts();
  if (category) return posts.filter((p) => p.category === category);
  return posts;
}

// ── Real-time listener ───────────────────────────────

export function subscribeToForumPosts(
  category: string | null,
  callback: (posts: ForumPost[]) => void
): Unsubscribe {
  if (!firebaseIsReady || !db) {
    // Demo mode: just load once
    loadForumPosts(category ?? undefined).then(callback);
    return () => {};
  }

  const col = collection(db, "forums");
  const constraints: QueryConstraint[] = category
    ? [where("category", "==", category), limit(50)]
    : [orderBy("createdAt", "desc"), limit(50)];
  const q = query(col, ...constraints);

  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map(docToPost);
    if (category) posts.sort((a, b) => b.createdAt - a.createdAt);
    callback(posts);
  });
}

// ── Flag / Report ────────────────────────────────────

export async function flagForumPost(postId: string): Promise<void> {
  if (firebaseIsReady && db) {
    await updateDoc(doc(db, "forums", postId), { flagged: true });
    return;
  }

  const posts = await loadLocalPosts();
  const updated = posts.map((p) =>
    p.id === postId ? { ...p, flagged: true } : p
  );
  await AsyncStorage.setItem(LS_KEY, JSON.stringify(updated));
}

// ── Helpers ──────────────────────────────────────────

function docToPost(d: any): ForumPost {
  const data = d.data();
  return {
    id: d.id,
    authorId: data.authorId ?? "",
    anonymousName: data.anonymousName ?? "anonymous",
    content: data.content ?? "",
    category: data.category ?? "vent",
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    flagged: !!data.flagged,
  };
}

async function loadLocalPosts(): Promise<ForumPost[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ForumPost[]) : [];
  } catch {
    return [];
  }
}
