/**
 * Push notifications — Expo Notifications + Firestore token storage.
 *
 * Token is saved at: users/{uid}/devices/{tokenHash}
 *
 * SDK 54 requires passing projectId to getExpoPushTokenAsync.
 * We read it from Constants.expoConfig.extra.eas.projectId
 * or fall back to the slug.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { db, firebaseIsReady } from "./firebase";

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission + register Expo push token in Firestore.
 * Returns the token string or null if permission denied / emulator.
 */
export async function registerForPushNotifications(
  uid: string
): Promise<string | null> {
  try {
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
        lightColor: "#16A34A",
      });
    }

    // SDK 54 requires projectId for Expo push tokens
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });
    const token = tokenData.data;

    // Persist token to Firestore so backend can send pushes
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

    console.log("Push token registered:", token);
    return token;
  } catch (error) {
    console.warn("Failed to register push notifications:", error);
    return null;
  }
}

/**
 * Schedule a local notification after N seconds.
 * Used for booking reminders, DM alerts, etc.
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
          ? null // fire immediately
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
 * Listen for notification taps — returns a subscription to clean up.
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
 * Get the last notification response (if app was opened by tapping a notification).
 */
export async function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
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
