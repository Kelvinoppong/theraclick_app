/**
 * Push notifications — Native FCM + expo-notifications for foreground display.
 *
 * Token flow:
 *   1. @react-native-firebase/messaging provides the native FCM token
 *   2. Token is saved at: users/{uid}/devices/{tokenHash}
 *   3. Notifications are sent directly via FCM Legacy HTTP API
 *
 * expo-notifications still handles:
 *   - Foreground notification display
 *   - Notification tap handlers
 *   - Local notifications (booking reminders)
 *   - Notification channels on Android
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import messaging from "@react-native-firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";

// FCM Legacy API server key — move to Cloud Functions for production
const FCM_SERVER_KEY = process.env.EXPO_PUBLIC_FCM_SERVER_KEY || "";

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission + register native FCM token in Firestore.
 * Returns the token string or null if permission denied / emulator.
 */
export async function registerForPushNotifications(
  uid: string
): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("[FCM] Push notifications require a physical device.");
      return null;
    }

    // Request notification permission via expo-notifications (creates channels)
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[FCM] Push notification permission denied.");
      return null;
    }

    // Android notification channels
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#16A34A",
      });

      await Notifications.setNotificationChannelAsync("calls", {
        name: "Incoming Calls",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: "#16A34A",
        sound: "default",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    // Request FCM permission (needed for iOS, harmless on Android)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("[FCM] Firebase messaging permission denied.");
      return null;
    }

    // Get native FCM token
    const token = await messaging().getToken();

    // Persist token to Firestore
    if (firebaseIsReady && db && uid && token) {
      const tokenHash = simpleHash(token);
      await setDoc(
        doc(db, "users", uid, "devices", tokenHash),
        {
          token,
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log("[FCM] Token registered:", token.slice(0, 20) + "...");
    return token;
  } catch (error) {
    console.warn("[FCM] Failed to register push notifications:", error);
    return null;
  }
}

/**
 * Schedule a local notification after N seconds.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerSeconds: number = 1
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger:
        triggerSeconds <= 0
          ? null
          : {
              seconds: triggerSeconds,
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            },
    });
  } catch (error) {
    console.warn("Failed to schedule notification:", error);
  }
}

/**
 * Fire an immediate local notification (no delay).
 */
export async function sendImmediateNotification(title: string, body: string) {
  return scheduleLocalNotification(title, body, 0);
}

/**
 * Listen for notification taps.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Listen for notifications received while app is in foreground.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Get the last notification response (cold start from notification tap).
 */
export async function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

// ── FCM Direct Send ─────────────────────────────────

/**
 * Fetch all FCM tokens for a user from Firestore.
 */
async function getUserPushTokens(uid: string): Promise<string[]> {
  if (!firebaseIsReady || !db) return [];
  try {
    const { getDocs, collection: col } = await import("firebase/firestore");
    const snap = await getDocs(col(db, "users", uid, "devices"));
    return snap.docs
      .map((d) => d.data().token as string)
      .filter((t) => !!t);
  } catch {
    return [];
  }
}

/**
 * Send a push notification directly via FCM Legacy HTTP API.
 */
async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  channelId: string = "default"
): Promise<boolean> {
  if (!FCM_SERVER_KEY) {
    console.warn("[FCM] No server key configured (EXPO_PUBLIC_FCM_SERVER_KEY)");
    return false;
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          sound: "default",
          android_channel_id: channelId,
          priority: "high",
        },
        data,
        priority: "high",
      }),
    });
    const result = await res.json();
    console.log("[FCM] Send response:", JSON.stringify(result));
    return result.success === 1;
  } catch (e) {
    console.warn("[FCM] Failed to send:", e);
    return false;
  }
}

/**
 * Send a call notification to a user via FCM.
 */
export async function sendCallNotification(
  receiverUid: string,
  callerName: string,
  callerUid: string,
  callId: string,
  callType: "audio" | "video"
): Promise<void> {
  console.log("[FCM] Fetching tokens for:", receiverUid);
  const tokens = await getUserPushTokens(receiverUid);
  console.log("[FCM] Found tokens:", tokens.length);
  if (tokens.length === 0) {
    console.log("[FCM] No tokens found for user:", receiverUid);
    return;
  }

  const title = callerName;
  const body = `${callerName} invited you to a ${callType} call. Tap to join.`;
  const data = {
    screen: "Call",
    callId,
    callType,
    otherName: callerName,
    callerUid,
  };

  for (const token of tokens) {
    await sendFcmNotification(token, title, body, data, "calls");
  }
}

/**
 * Send a DM notification to a user via FCM.
 */
export async function sendMessageNotification(
  receiverUid: string,
  senderName: string,
  messageText: string,
  chatId: string
): Promise<void> {
  const tokens = await getUserPushTokens(receiverUid);
  if (tokens.length === 0) return;

  const preview = messageText.length > 100
    ? messageText.slice(0, 100) + "\u2026"
    : messageText;

  const data = {
    screen: "DirectMessage",
    chatId,
    otherName: senderName,
  };

  for (const token of tokens) {
    await sendFcmNotification(token, senderName, preview, data, "default");
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
