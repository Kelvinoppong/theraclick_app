/**
 * DirectMessageScreen — real-time DM between student and mentor/counselor.
 *
 * Uses the `directMessages` Firestore collection (shared with web).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  subscribeToDmMessages,
  sendDirectMessage,
  DirectMessage,
} from "../services/messagingStore";
import { sendImmediateNotification } from "../services/notifications";
import { addNotification } from "../services/notificationStore";

import { MessageBubble } from "../components/MessageBubble";
import { ChatInput } from "../components/ChatInput";

export type DirectMessageParams = {
  chatId: string;
  otherName: string;
};

type Props = NativeStackScreenProps<any, "DirectMessage">;

export function DirectMessageScreen({ route }: Props) {
  const { chatId, otherName } = route.params as DirectMessageParams;
  const { profile } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [sending, setSending] = useState(false);

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

      // Notify the other person (local push + in-app feed)
      const senderName = profile.fullName || "Someone";
      const title = `New message from ${senderName}`;
      const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerName}>{otherName}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              sender={item.senderId === profile?.uid ? "user" : "ai"}
            />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToEnd}
        />
        <ChatInput onSend={handleSend} disabled={sending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
});
