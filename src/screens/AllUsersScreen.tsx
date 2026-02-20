/**
 * AllUsersScreen — admin view of every user on the platform.
 *
 * Features:
 *   - Search bar (by name or email)
 *   - Role filter chips (All, Students, Counselors, Mentors)
 *   - User cards with status badges
 *   - Tap a user → action sheet to activate / disable
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchAllUsers,
  updateUserStatus,
  type AdminUser,
} from "../services/adminStore";
import type { UserRole } from "../shared/types";

type Filter = "all" | "student" | "counselor" | "peer-mentor" | "admin";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "student", label: "Students" },
  { key: "counselor", label: "Counselors" },
  { key: "peer-mentor", label: "Mentors" },
  { key: "admin", label: "Admins" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#DCFCE7", text: "#16A34A" },
  pending: { bg: "#FEF3C7", text: "#D97706" },
  disabled: { bg: "#FEE2E2", text: "#DC2626" },
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  counselor: "Counselor",
  "peer-mentor": "Peer Mentor",
  admin: "Admin",
};

export function AllUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const loadUsers = useCallback(async () => {
    try {
      const all = await fetchAllUsers();
      setUsers(all);
    } catch (e) {
      console.warn("Failed to load users:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = u.fullName?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch) return false;
    }
    return true;
  });

  const handleUserAction = (user: AdminUser) => {
    const actions: any[] = [];

    if (user.status !== "active") {
      actions.push({
        text: "Activate",
        onPress: async () => {
          await updateUserStatus(user.uid, "active");
          setUsers((prev) =>
            prev.map((u) =>
              u.uid === user.uid ? { ...u, status: "active" as const } : u
            )
          );
        },
      });
    }

    if (user.status !== "disabled") {
      actions.push({
        text: "Disable",
        style: "destructive" as const,
        onPress: async () => {
          await updateUserStatus(user.uid, "disabled");
          setUsers((prev) =>
            prev.map((u) =>
              u.uid === user.uid ? { ...u, status: "disabled" as const } : u
            )
          );
        },
      });
    }

    if (user.status === "pending") {
      actions.push({
        text: "Approve (Activate)",
        onPress: async () => {
          await updateUserStatus(user.uid, "active");
          setUsers((prev) =>
            prev.map((u) =>
              u.uid === user.uid ? { ...u, status: "active" as const } : u
            )
          );
        },
      });
    }

    actions.push({ text: "Cancel", style: "cancel" as const });

    Alert.alert(
      user.fullName || "User",
      `Role: ${ROLE_LABELS[user.role || ""] || "None"}\nStatus: ${user.status}\n${user.email || ""}`,
      actions
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator
          size="large"
          color="#16A34A"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>All Users</Text>
        <Text style={styles.countText}>{filtered.length} users</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User List */}
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.uid}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No users found.</Text>
        }
        renderItem={({ item }) => {
          const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.active;

          return (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => handleUserAction(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.fullName?.[0] || "?").toUpperCase()}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.fullName || "No name"}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email || "No email"}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.roleTag}>
                    {ROLE_LABELS[item.role || ""] || "No role"}
                  </Text>
                  {item.school && (
                    <Text style={styles.schoolText}>· {item.school}</Text>
                  )}
                </View>
              </View>

              <View
                style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
              >
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  countText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  searchWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#6366F1",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  userEmail: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  roleTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  schoolText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
