/**
 * DirectMessageScreen — real-time DM between student and mentor/counselor.
 *
 * Uses the `directMessages` Firestore collection (shared with web).
 * Header includes audio/video call buttons that navigate to CallScreen.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import {
  subscribeToDmMessages,
  sendDirectMessage,
  DirectMessage,
} from "../services/messagingStore";
import { sendImmediateNotification, sendCallNotification } from "../services/notifications";
import { addNotification } from "../services/notificationStore";
import { createCall, type CallType } from "../services/callStore";
import { db, firebaseIsReady } from "../services/firebase";

import { MessageBubble } from "../components/MessageBubble";
import { ChatInput } from "../components/ChatInput";

export type DirectMessageParams = {
  chatId: string;
  otherName: string;
  otherUid?: string;
};

type Props = NativeStackScreenProps<any, "DirectMessage">;

export function DirectMessageScreen({ route, navigation }: Props) {
  const { chatId, otherName, otherUid: passedOtherUid } =
    route.params as DirectMessageParams;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [resolvedOtherUid, setResolvedOtherUid] = useState<string | null>(
    passedOtherUid ?? null
  );

  // Resolve the other participant's UID from the DM thread
  useEffect(() => {
    if (resolvedOtherUid || !firebaseIsReady || !db || !profile) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "directMessages", chatId));
        const participants: string[] = snap.data()?.participants ?? [];
        const other = participants.find((uid) => uid !== profile.uid);
        if (other) setResolvedOtherUid(other);
      } catch {}
    })();
  }, [chatId, profile]);

  useEffect(() => {
    const unsub = subscribeToDmMessages(chatId, setMessages);
    return () => unsub();
  }, [chatId]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(scrollToEnd, [messages.length]);

  const handleSend = async (text: string) => {
    if (!profile) return;
    setSending(true);
    try {
      await sendDirectMessage(chatId, profile.uid, text);

      const senderName = profile.fullName || "Someone";
      const title = `New message from ${senderName}`;
      const preview = text.length > 80 ? text.slice(0, 80) + "\u2026" : text;

      sendImmediateNotification(title, preview);
      addNotification({
        type: "dm_received",
        title,
        body: preview,
        screen: "DirectMessage",
        data: { chatId, otherName },
      });
    } finally {
      setSending(false);
    }
  };

  const startCall = async (type: CallType) => {
    if (!profile || !resolvedOtherUid) return;
    try {
      const callerName = profile.fullName || "Unknown";
      const callId = await createCall(
        profile.uid,
        resolvedOtherUid,
        callerName,
        otherName,
        type
      );

      // Send push notification so receiver gets alerted even if app is closed
      sendCallNotification(resolvedOtherUid, callerName, profile.uid, callId, type);

      navigation.navigate("Call", {
        callId,
        callType: type,
        otherName,
        otherUid: resolvedOtherUid,
        isCaller: true,
      });
    } catch (e) {
      console.warn("Failed to start call:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with call buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>{"\u2039"}</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={styles.headerSub}>tap here for info</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => startCall("audio")}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => startCall("video")}
          >
            <Text style={styles.callIcon}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const isMe = item.senderId === profile?.uid;
            return (
              <MessageBubble
                text={item.text}
                sender={isMe ? "user" : "ai"}
                showAvatar={false}
                timestamp={item.createdAt}
              />
            );
          }}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToEnd}
        />
        <View style={{ paddingBottom: insets.bottom }}>
          <ChatInput onSend={handleSend} disabled={sending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 28,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: -2,
  },
  headerCenter: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 6 },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  callIcon: { fontSize: 18 },
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
});
