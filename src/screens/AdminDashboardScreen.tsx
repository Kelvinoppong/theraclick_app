/**
 * AdminDashboardScreen — overview hub for platform administrators.
 *
 * Shows:
 *   - Greeting with admin name
 *   - Key stat cards (total users, students, counselors, mentors, pending)
 *   - Quick action buttons (manage users, approvals, forums)
 *   - Recent pending accounts preview
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  fetchAllUsers,
  computeStats,
  type AdminUser,
  type PlatformStats,
} from "../services/adminStore";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMPTY_STATS: PlatformStats = {
  totalUsers: 0,
  students: 0,
  counselors: 0,
  peerMentors: 0,
  admins: 0,
  pending: 0,
  active: 0,
  disabled: 0,
};

export function AdminDashboardScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();

  const [stats, setStats] = useState<PlatformStats>(EMPTY_STATS);
  const [pendingPreview, setPendingPreview] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const users = await fetchAllUsers();
      const s = computeStats(users);
      setStats(s);
      setPendingPreview(
        users.filter((u) => u.status === "pending").slice(0, 5)
      );
    } catch (e) {
      console.warn("Admin dashboard load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const firstName = profile?.fullName?.split(" ")[0] || "Admin";

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.subtitle}>Platform Overview</Text>
        </View>

        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            emoji="👥"
            label="Total Users"
            value={stats.totalUsers}
            color="#3B82F6"
          />
          <StatCard
            emoji="🎓"
            label="Students"
            value={stats.students}
            color="#16A34A"
          />
          <StatCard
            emoji="🩺"
            label="Counselors"
            value={stats.counselors}
            color="#8B5CF6"
          />
          <StatCard
            emoji="🤝"
            label="Peer Mentors"
            value={stats.peerMentors}
            color="#F59E0B"
          />
          <StatCard
            emoji="⏳"
            label="Pending"
            value={stats.pending}
            color="#EF4444"
          />
          <StatCard
            emoji="✅"
            label="Active"
            value={stats.active}
            color="#10B981"
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => nav.navigate("AllUsers")}
          >
            <Text style={styles.actionEmoji}>👥</Text>
            <Text style={styles.actionLabel}>All Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => nav.navigate("Approvals")}
          >
            <Text style={styles.actionEmoji}>✅</Text>
            <Text style={styles.actionLabel}>Approvals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => nav.navigate("AllUsers")}
          >
            <Text style={styles.actionEmoji}>🩺</Text>
            <Text style={styles.actionLabel}>Counselors</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Preview */}
        {pendingPreview.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Approvals</Text>
              <TouchableOpacity onPress={() => nav.navigate("Approvals")}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {pendingPreview.map((user) => (
              <View key={user.uid} style={styles.pendingCard}>
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingAvatarText}>
                    {(user.fullName?.[0] || "?").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingName}>
                    {user.fullName || "Unknown"}
                  </Text>
                  <Text style={styles.pendingMeta}>
                    {user.role || "No role"} · {user.email || "No email"}
                  </Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Stat Card Component ─── */

function StatCard({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#6B7280" },
  scroll: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  /* Quick Actions */
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },

  /* Pending Preview Cards */
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  pendingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D97706",
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  pendingMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
  },
});
