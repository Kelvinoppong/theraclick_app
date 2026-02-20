/**
 * NotificationsScreen — in-app activity feed.
 *
 * Shows recent events: bookings, messages, approvals, system alerts.
 * Each row has: type icon, title, body, relative time, unread dot.
 * Tapping a row marks it read and navigates to the relevant screen.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  AppNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  NotificationType,
} from "../services/notificationStore";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  booking_created: { icon: "📅", color: "#DCFCE7" },
  booking_confirmed: { icon: "✅", color: "#DCFCE7" },
  booking_cancelled: { icon: "❌", color: "#FEF2F2" },
  dm_received: { icon: "💬", color: "#EFF6FF" },
  approval_update: { icon: "🛡️", color: "#FEF3C7" },
  system: { icon: "🔔", color: "#F3F4F6" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function NotificationsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    const all = await getNotifications();
    setItems(all);
  }, []);

  // Reload every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleTap = async (notif: AppNotification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
      setItems((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }

    // Deep-link to relevant screen
    if (notif.screen === "DirectMessage" && notif.params?.chatId) {
      nav.navigate("DirectMessage", {
        chatId: notif.params.chatId,
        otherName: notif.params.otherName || "Chat",
      });
    } else if (notif.screen === "Booking" || notif.type.startsWith("booking")) {
      nav.navigate("MainTabs");
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const displayed = filter === "unread" ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === "unread" && styles.filterTabActive,
          ]}
          onPress={() => setFilter("unread")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "unread" && styles.filterTabTextActive,
            ]}
          >
            Unread
            {unreadCount > 0 && (
              <Text style={styles.filterBadge}> {unreadCount}</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={displayed}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
          />
        }
        contentContainerStyle={displayed.length === 0 ? styles.emptyWrap : undefined}
        renderItem={({ item }) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
          return (
            <TouchableOpacity
              style={[styles.row, !item.read && styles.rowUnread]}
              onPress={() => handleTap(item)}
              activeOpacity={0.6}
            >
              {/* Type icon */}
              <View style={[styles.iconWrap, { backgroundColor: config.color }]}>
                <Text style={styles.icon}>{config.icon}</Text>
              </View>

              {/* Content */}
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.time}>{timeAgo(item.timestamp)}</Text>
                </View>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>

              {/* Unread dot */}
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              {filter === "unread"
                ? "You're all caught up!"
                : "Activity from bookings, messages, and updates will appear here."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  markAllText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTabActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterTabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterTabTextActive: { color: "#FFFFFF" },
  filterBadge: { fontWeight: "800" },

  /* Notification row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowUnread: {
    backgroundColor: "#F0FDF4",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  title: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  body: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginLeft: 8,
  },

  /* Empty state */
  emptyWrap: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
