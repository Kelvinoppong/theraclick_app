/**
 * ChatScreen — AI chat interface.
 *
 * Calls POST /api/ai/chat on the Next.js backend (via apiClient).
 * Persists messages to Firestore (or AsyncStorage in demo mode).
 * Detects crisis keywords client-side for instant Emergency modal.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { sendChatMessage } from "../services/apiClient";
import {
  ensureDefaultAiThread,
  loadAiThreadMessages,
  appendAiThreadMessage,
} from "../services/chatStore";
import { looksLikeCrisis } from "../shared/safety";
import type {
  StoredChatMessage,
  ChatMessage,
  UserContext,
} from "../shared/types";
import type { RootStackParamList } from "../navigation/RootStack";

import { MessageBubble } from "../components/MessageBubble";
import { ChatInput } from "../components/ChatInput";
import { LoadingIndicator } from "../components/LoadingIndicator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ChatScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Load existing messages on mount
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const tid = await ensureDefaultAiThread(profile);
      setThreadId(tid);
      const msgs = await loadAiThreadMessages(profile, tid);
      setMessages(msgs);
    })();
  }, [profile]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!profile || !threadId) return;

      // Client-side crisis check — show Emergency immediately
      if (looksLikeCrisis(text)) {
        nav.navigate("Emergency");
      }

      // Add user message locally
      const userMsg: StoredChatMessage = {
        id: `u_${Date.now()}`,
        sender: "user",
        text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      scrollToEnd();

      // Persist user message
      await appendAiThreadMessage(profile, threadId, {
        sender: "user",
        text,
      });

      // Build API payload (matches web's POST /api/ai/chat body)
      const apiMessages: ChatMessage[] = [
        ...messages.map((m) => ({
          role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        })),
        { role: "user" as const, content: text },
      ];

      const userContext: UserContext = {
        role: profile.role ?? undefined,
        displayName: profile.anonymousEnabled
          ? profile.anonymousId ?? undefined
          : profile.fullName ?? undefined,
        school: profile.student?.school ?? undefined,
        educationLevel: profile.student?.educationLevel ?? undefined,
        country: "Ghana",
      };

      setLoading(true);
      try {
        const res = await sendChatMessage(apiMessages, userContext);

        if (!res.ok || !res.message) {
          Alert.alert("Error", res.error || "No response from AI.");
          setLoading(false);
          return;
        }

        // If backend flagged crisis, also show Emergency
        if (res.mode === "crisis") {
          nav.navigate("Emergency");
        }

        const aiMsg: StoredChatMessage = {
          id: `ai_${Date.now()}`,
          sender: "ai",
          text: res.message,
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        scrollToEnd();

        await appendAiThreadMessage(profile, threadId, {
          sender: "ai",
          text: res.message,
        });
      } catch (e: any) {
        Alert.alert("Network error", e?.message || "Could not reach server.");
      } finally {
        setLoading(false);
      }
    },
    [profile, threadId, messages, nav, scrollToEnd]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble text={item.text} sender={item.sender} />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={loading ? <LoadingIndicator /> : null}
        />
        <ChatInput onSend={handleSend} disabled={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  flex: { flex: 1 },
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
});
