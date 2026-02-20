/**
 * HTTP client for calling the Next.js backend API routes.
 *
 * WHY a thin wrapper? So every screen uses the same base URL,
 * timeout, and error handling. If the backend moves or we add
 * auth headers later, we change it in one place.
 */

import axios from "axios";
import type { AiChatResponse, ChatMessage, UserContext } from "../shared/types";

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Send a chat message to the AI endpoint.
 * Mirrors the POST /api/ai/chat contract from the web app.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  userContext?: UserContext
): Promise<AiChatResponse> {
  try {
    const { data } = await client.post<AiChatResponse>("/api/ai/chat", {
      messages,
      userContext,
    });
    return data;
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Network error — check your connection.",
    };
  }
}

/**
 * Admin: fetch pending users (requires admin bearer token).
 */
export async function fetchPendingUsers(adminToken: string) {
  const { data } = await client.get("/api/admin/pending", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return data;
}

/**
 * Admin: approve a user.
 */
export async function approveUser(uid: string, adminToken: string) {
  const { data } = await client.post(
    `/api/admin/users/${uid}/approve`,
    {},
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return data;
}

/**
 * Admin: reject a user.
 */
export async function rejectUser(uid: string, adminToken: string) {
  const { data } = await client.post(
    `/api/admin/users/${uid}/reject`,
    {},
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return data;
}
