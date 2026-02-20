/**
 * ChatScreen — AI counsellor chat with Gemini-style thread history.
 *
 * Features:
 *   - Welcome state with suggestion chips when a thread is empty
 *   - Hamburger button → ChatHistoryDrawer (slide-in from left)
 *   - New Chat creates a fresh thread; old threads listed in drawer
 *   - Thread auto-titles itself from the first user message
 *   - Crisis detection + Firestore persistence all preserved
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
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
  createAiThread,
  listAiThreads,
  updateThreadTitle,
  deleteAiThread,
} from "../services/chatStore";
import { looksLikeCrisis } from "../shared/safety";
import type {
  StoredChatMessage,
  ChatMessage,
  ChatThread,
  UserContext,
} from "../shared/types";
import type { RootStackParamList } from "../navigation/RootStack";

import { MessageBubble } from "../components/MessageBubble";
import { ChatInput } from "../components/ChatInput";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ChatHistoryDrawer } from "../components/ChatHistoryDrawer";

const BOT_ICON = require("../components/app_icon.jpeg");

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SUGGESTIONS = [
  "I'm feeling anxious",
  "Help me study better",
  "I need someone to talk to",
  "Breathing exercise",
  "How to handle exam stress",
];

export function ChatScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Track whether the current thread has been auto-titled yet
  const hasTitledRef = useRef(false);

  /* ─── Initial load: ensure default thread + fetch thread list ─── */
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const tid = await ensureDefaultAiThread(profile);
        setThreadId(tid);
        const msgs = await loadAiThreadMessages(profile, tid);
        setMessages(msgs);
        hasTitledRef.current = msgs.length > 0;
        refreshThreadList();
      } catch (e) {
        console.warn("ChatScreen init error:", e);
        setThreadId("default");
      }
    })();
  }, [profile]);

  const refreshThreadList = useCallback(async () => {
    if (!profile) return;
    const list = await listAiThreads(profile);
    setThreads(list);
  }, [profile]);

  /* ─── Switch to a different thread ─── */
  const switchThread = useCallback(
    async (newThreadId: string) => {
      if (!profile || newThreadId === threadId) {
        setDrawerVisible(false);
        return;
      }
      const msgs = await loadAiThreadMessages(profile, newThreadId);
      setThreadId(newThreadId);
      setMessages(msgs);
      hasTitledRef.current = msgs.length > 0;
      setDrawerVisible(false);
    },
    [profile, threadId]
  );

  /* ─── Create a new chat thread ─── */
  const handleNewChat = useCallback(async () => {
    if (!profile) return;
    const newId = await createAiThread(profile, "New chat");
    setThreadId(newId);
    setMessages([]);
    hasTitledRef.current = false;
    await refreshThreadList();
    setDrawerVisible(false);
  }, [profile, refreshThreadList]);

  /* ─── Delete a thread ─── */
  const handleDeleteThread = useCallback(
    async (delId: string) => {
      if (!profile) return;
      await deleteAiThread(profile, delId);

      // If we deleted the active thread, switch to a different one
      if (delId === threadId) {
        const remaining = threads.filter((t) => t.id !== delId);
        if (remaining.length > 0) {
          await switchThread(remaining[0].id);
        } else {
          // No threads left — create a fresh one
          await handleNewChat();
        }
      }
      await refreshThreadList();
    },
    [profile, threadId, threads, switchThread, handleNewChat, refreshThreadList]
  );

  const scrollToEnd = useCallback(() => {
    setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: true }),
      100
    );
  }, []);

  /* ─── Auto-title: uses first user message (truncated) ─── */
  const autoTitle = useCallback(
    async (text: string) => {
      if (!profile || !threadId || hasTitledRef.current) return;
      hasTitledRef.current = true;
      const title =
        text.length > 40 ? text.slice(0, 40).trim() + "…" : text;
      await updateThreadTitle(profile, threadId, title);
      await refreshThreadList();
    },
    [profile, threadId, refreshThreadList]
  );

  /* ─── Send message ─── */
  const handleSend = useCallback(
    async (text: string) => {
      if (!profile || !threadId) return;

      if (looksLikeCrisis(text)) {
        nav.navigate("Emergency");
      }

      // Auto-title on first message in thread
      autoTitle(text);

      const userMsg: StoredChatMessage = {
        id: `u_${Date.now()}`,
        sender: "user",
        text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      scrollToEnd();

      await appendAiThreadMessage(profile, threadId, {
        sender: "user",
        text,
      });

      const apiMessages: ChatMessage[] = [
        ...messages.map((m) => ({
          role: (m.sender === "user" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content: m.text,
        })),
        { role: "user" as const, content: text },
      ];

      const userContext: UserContext = {
        role: profile.role ?? undefined,
        displayName: profile.anonymousEnabled
          ? (profile.anonymousId ?? undefined)
          : (profile.fullName ?? undefined),
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
        Alert.alert(
          "Network error",
          e?.message || "Could not reach server."
        );
      } finally {
        setLoading(false);
      }
    },
    [profile, threadId, messages, nav, scrollToEnd, autoTitle]
  );

  /* ---------- Welcome state (no messages yet) ---------- */
  const WelcomeView = () => {
    const firstName = profile?.fullName?.split(" ")[0] || "there";

    return (
      <View style={styles.welcomeContainer}>
        <Image source={BOT_ICON} style={styles.welcomeIcon} />
        <Text style={styles.welcomeTitle}>
          Hello {firstName}, {"\n"}how can I help?
        </Text>
        <Text style={styles.welcomeSubtitle}>
          I'm your Theraklick AI companion. Ask me anything about mental
          wellness, study tips, or just vent — I'm here for you.
        </Text>

        <View style={styles.chipsContainer}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.chip}
              onPress={() => handleSend(s)}
            >
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const showWelcome = messages.length === 0 && !loading;

  // Find current thread title for header
  const currentThread = threads.find((t) => t.id === threadId);
  const headerSubtitle =
    currentThread && currentThread.title !== "New chat"
      ? currentThread.title
      : "Always here for you";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => {
            refreshThreadList();
            setDrawerVisible(true);
          }}
        >
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 16 }]} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <Image source={BOT_ICON} style={styles.headerIcon} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Theraklick AI</Text>
          <Text style={styles.headerStatus} numberOfLines={1}>
            {headerSubtitle}
          </Text>
        </View>

        {/* New Chat shortcut in header */}
        <TouchableOpacity style={styles.newChatHeaderBtn} onPress={handleNewChat}>
          <Text style={styles.newChatHeaderIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {showWelcome ? (
          <WelcomeView />
        ) : (
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
        )}
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          placeholder={
            showWelcome ? "Type your thoughts..." : "Ask me anything..."
          }
        />
      </KeyboardAvoidingView>

      {/* Drawer overlay — rendered last so it sits on top */}
      <ChatHistoryDrawer
        visible={drawerVisible}
        threads={threads}
        activeThreadId={threadId}
        onClose={() => setDrawerVisible(false)}
        onSelectThread={switchThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  flex: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },
  hamburger: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#374151",
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerStatus: {
    fontSize: 12,
    color: "#16A34A",
    marginTop: 1,
  },
  newChatHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  newChatHeaderIcon: {
    fontSize: 18,
    color: "#16A34A",
  },

  /* Messages list */
  list: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },

  /* Welcome state */
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    backgroundColor: "#DCFCE7",
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },
});
