import React, { useState, useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "./src/context/AuthContext";
import { RootNavigator } from "./src/navigation/RootStack";
import { SplashScreen } from "./src/components/SplashScreen";
import { IncomingCallOverlay } from "./src/components/IncomingCallOverlay";
import { navigationRef } from "./src/navigation/navigationRef";

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
    notifResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationData(response.notification.request.content.data);
      });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationData(response.notification.request.content.data);
      }
    });

    notifReceivedListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Notif] Foreground:", notification.request.content.title);
      });

    return () => {
      notifResponseListener.current?.remove();
      notifReceivedListener.current?.remove();
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
