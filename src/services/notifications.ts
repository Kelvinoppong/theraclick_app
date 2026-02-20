/**
 * Push notifications — Expo Notifications + Firestore token storage.
 *
 * WHY Expo push over raw FCM?
 *   - Works cross-platform (iOS + Android) with one API
 *   - Expo handles the APNs/FCM plumbing
 *   - Token stored in Firestore so the backend (or Cloud Functions)
 *     can trigger pushes for booking confirmations, mentor replies, etc.
 *
 * Token is saved at: users/{uid}/devices/{tokenHash}
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request push permission and register the Expo push token
 * in Firestore under the user's profile.
 */
export async function registerForPushNotifications(
  uid: string
): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied.");
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Persist token to Firestore
  if (firebaseIsReady && db && uid) {
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

  return token;
}

/**
 * Schedule a local notification (for booking reminders etc.).
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerSeconds: number
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { seconds: triggerSeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}

/**
 * Listen for notification taps (for deep-linking).
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
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
