/**
 * MentorDashboardScreen — Peer Mentor home.
 *
 * Shows: active DM threads with students, quick stats,
 * and ability to set availability / escalate to counselor.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  subscribeToDmThreads,
  DirectChat,
} from "../services/messagingStore";

type Nav = NativeStackNavigationProp<any>;

export function MentorDashboardScreen() {
  const { profile, logout } = useAuth();
  const nav = useNavigation<Nav>();
  const [threads, setThreads] = useState<DirectChat[]>([]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToDmThreads(profile.uid, setThreads);
    return () => unsub();
  }, [profile]);

  const displayName = profile?.fullName || "Mentor";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {displayName}</Text>
          <Text style={styles.role}>Peer Mentor</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{threads.length}</Text>
          <Text style={styles.statLabel}>Active Chats</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Escalations</Text>
        </View>
      </View>

      {/* DM Threads */}
      <Text style={styles.sectionTitle}>Student Conversations</Text>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const otherUid = item.participants.find((p) => p !== profile?.uid) || "unknown";
          return (
            <TouchableOpacity
              style={styles.threadCard}
              onPress={() =>
                nav.navigate("DirectMessage", {
                  chatId: item.id,
                  otherName: otherUid.slice(0, 10),
                })
              }
            >
              <Text style={styles.threadName}>{otherUid.slice(0, 12)}</Text>
              <Text style={styles.threadPreview} numberOfLines={1}>
                {item.lastMessage || "No messages yet"}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations yet. Students will appear here when they reach out.</Text>
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827" },
  role: { fontSize: 13, fontWeight: "600", color: "#16A34A", marginTop: 2 },
  logoutText: { color: "#EF4444", fontSize: 13, fontWeight: "600", marginTop: 4 },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNum: { fontSize: 24, fontWeight: "800", color: "#16A34A" },
  statLabel: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 40 },
  threadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  threadName: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  threadPreview: { fontSize: 13, color: "#6B7280" },
  empty: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 30, paddingHorizontal: 20 },
});
