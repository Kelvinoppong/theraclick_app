/**
 * ChatHistoryDrawer — Gemini-style slide-in panel from the left.
 *
 * Shows all past AI chat threads, sorted newest first.
 * Allows creating new chats, switching threads, and deleting old ones.
 *
 * Uses an Animated overlay + translateX for the slide effect,
 * keeping it lightweight without extra navigation dependencies.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Alert,
} from "react-native";
import type { ChatThread } from "../shared/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

type Props = {
  visible: boolean;
  threads: ChatThread[];
  activeThreadId: string | null;
  onClose: () => void;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const days = Math.floor(diff / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ChatHistoryDrawer({
  visible,
  threads,
  activeThreadId,
  onClose,
  onSelectThread,
  onNewChat,
  onDeleteThread,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDelete = (thread: ChatThread) => {
    Alert.alert(
      "Delete chat",
      `Remove "${thread.title}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteThread(thread.id),
        },
      ]
    );
  };

  // Don't render anything when fully hidden to avoid blocking touches
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Chat History</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* New Chat button */}
        <TouchableOpacity style={styles.newChatBtn} onPress={onNewChat}>
          <Text style={styles.newChatIcon}>+</Text>
          <Text style={styles.newChatText}>New Chat</Text>
        </TouchableOpacity>

        {/* Thread list */}
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chat history yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation above
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = item.id === activeThreadId;
            return (
              <TouchableOpacity
                style={[styles.threadRow, isActive && styles.threadRowActive]}
                onPress={() => onSelectThread(item.id)}
                onLongPress={() => handleDelete(item)}
              >
                <View style={styles.threadIcon}>
                  <Text style={styles.threadIconText}>💬</Text>
                </View>
                <View style={styles.threadInfo}>
                  <Text
                    style={[
                      styles.threadTitle,
                      isActive && styles.threadTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.threadDate}>
                    {formatDate(item.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.drawerFooter}>
          <Text style={styles.footerText}>Long-press to delete a chat</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 10,
  },

  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: "#6B7280",
  },

  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  newChatIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },

  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
  },
  threadRowActive: {
    backgroundColor: "#F0FDF4",
  },
  threadIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  threadIconText: {
    fontSize: 16,
  },
  threadInfo: {
    flex: 1,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  threadTitleActive: {
    color: "#16A34A",
    fontWeight: "600",
  },
  threadDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },

  drawerFooter: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
