import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import { AuthProvider } from "./src/context/AuthContext";
import { RootNavigator } from "./src/navigation/RootStack";
import { SplashScreen } from "./src/components/SplashScreen";
import { IncomingCallOverlay } from "./src/components/IncomingCallOverlay";
import { navigationRef } from "./src/navigation/navigationRef";

// Handle FCM messages when app is in background/killed (must be outside component)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("[FCM] Background message:", remoteMessage.notification?.title);
});

function handleNotificationData(data: Record<string, any> | undefined) {
  if (!data || !navigationRef.current) return;

  if (data.screen === "DirectMessage" && data.chatId) {
    navigationRef.current.navigate("DirectMessage" as never, {
      chatId: data.chatId,
      otherName: data.otherName || "Chat",
    } as never);
  } else if (data.screen === "Booking") {
    navigationRef.current.navigate("MainTabs" as never);
  } else if (data.screen === "Chat") {
    navigationRef.current.navigate("MainTabs" as never);
  } else if (data.screen === "Call" && data.callId) {
    navigationRef.current.navigate("Call" as never, {
      callId: data.callId,
      callType: data.callType || "audio",
      otherName: data.otherName || "Call",
      otherUid: data.callerUid || "",
      isCaller: false,
    } as never);
  }
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const notifResponseListener = useRef<Notifications.EventSubscription>();
  const notifReceivedListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Expo: when user taps a notification → navigate
    notifResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationData(response.notification.request.content.data);
      });

    // Expo: cold start from notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationData(response.notification.request.content.data);
      }
    });

    // Expo: foreground notification display
    notifReceivedListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Notif] Foreground:", notification.request.content.title);
      });

    // FCM: when user taps a notification that opened the app from killed/background
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          handleNotificationData(remoteMessage.data as Record<string, any>);
        }
      });

    // FCM: when user taps a notification while app is in background
    const fcmOnOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage?.data) {
        handleNotificationData(remoteMessage.data as Record<string, any>);
      }
    });

    // FCM: foreground message — show as local notification so it appears
    const fcmOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log("[FCM] Foreground message:", remoteMessage.notification?.title);
      if (remoteMessage.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title || "",
            body: remoteMessage.notification.body || "",
            sound: true,
            data: (remoteMessage.data as Record<string, string>) || {},
          },
          trigger: null,
        });
      }
    });

    return () => {
      notifResponseListener.current?.remove();
      notifReceivedListener.current?.remove();
      fcmOnOpen();
      fcmOnMessage();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
        {splashDone && (
          <>
            <StatusBar style="dark" />
            <RootNavigator />
            <IncomingCallOverlay />
          </>
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
