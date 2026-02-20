/**
 * In-app notification store — AsyncStorage-backed activity feed.
 *
 * Each notification has: id, type, title, body, timestamp, read flag, and
 * optional navigation data so tapping it can deep-link to the right screen.
 *
 * This is separate from OS push notifications. It powers the in-app
 * Notifications tab so users can review past events.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORE_KEY = "theraclick.notifications.v1";
const MAX_NOTIFICATIONS = 50;

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "dm_received"
  | "approval_update"
  | "system";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  /** Optional deep-link data */
  screen?: string;
  params?: Record<string, string>;
};

async function loadAll(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

async function saveAll(items: AppNotification[]) {
  const trimmed = items.slice(0, MAX_NOTIFICATIONS);
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
}

/** Push a new notification to the top of the list. */
export async function addNotification(
  notif: Omit<AppNotification, "id" | "timestamp" | "read">
): Promise<AppNotification> {
  const entry: AppNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    read: false,
  };
  const existing = await loadAll();
  await saveAll([entry, ...existing]);
  return entry;
}

/** Get all notifications, newest first. */
export async function getNotifications(): Promise<AppNotification[]> {
  return loadAll();
}

/** Count unread notifications. */
export async function getUnreadCount(): Promise<number> {
  const all = await loadAll();
  return all.filter((n) => !n.read).length;
}

/** Mark a single notification as read. */
export async function markAsRead(id: string): Promise<void> {
  const all = await loadAll();
  const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n));
  await saveAll(updated);
}

/** Mark all notifications as read. */
export async function markAllAsRead(): Promise<void> {
  const all = await loadAll();
  const updated = all.map((n) => ({ ...n, read: true }));
  await saveAll(updated);
}

/** Clear all notifications. */
export async function clearNotifications(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
}
